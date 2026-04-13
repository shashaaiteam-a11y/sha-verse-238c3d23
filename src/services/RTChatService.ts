/**
 * RTChatService - Real-Time Chat Service (WhatsApp Architecture)
 * 
 * Core Features:
 * ✅ Message Ticks (✓, ✓✓, ✓✓ Blue)
 * ✅ Block System with Privacy Middleware
 * ✅ Online/Offline + Last Seen Tracking
 * ✅ Unread Badge Count Management
 * ✅ Read Receipts Control
 * ✅ Message Status State Machine
 * ✅ Idempotent Message Operations (client_id)
 * ✅ Presence Service
 */

import { supabase } from '@/integrations/supabase/client';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';
export type PresenceStatus = 'online' | 'offline';
export type LastSeenVisibility = 'everyone' | 'contacts' | 'nobody';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  edited_at?: string;
  deleted_for_all?: boolean;
  metadata?: Record<string, any>;
  client_id?: string;
}

interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  is_online: boolean;
}

interface BlockInfo {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Privacy Middleware: Check visibility before routing/reading data
 */
export class PrivacyMiddleware {
  /**
   * Check if one user can interact with another
   * Returns false if blocked
   */
  static async canInteract(fromUserId: string, toUserId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_blocks')
      .select('id', { count: 'exact' })
      .eq('blocker_id', toUserId)
      .eq('blocked_id', fromUserId)
      .maybeSingle();

    return !data; // true if no block record
  }

  /**
   * Check if user can view another user's last seen
   * Respects privacy setting + reciprocity rule
   */
  static async canViewLastSeen(
    viewerId: string,
    targetId: string,
    targetSettings: any
  ): Promise<boolean> {
    // Check block first
    const canInteract = await this.canInteract(viewerId, targetId);
    if (!canInteract) return false;

    const lastSeenVisibility = targetSettings?.last_seen_visibility || 'everyone';
    
    if (lastSeenVisibility === 'nobody') return false;
    if (lastSeenVisibility === 'everyone') return true;
    
    // 'contacts': check if mutual contacts
    const { data: contact } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', viewerId)
      .eq('friend_id', targetId)
      .eq('status', 'accepted')
      .maybeSingle();

    return !!contact;
  }

  /**
   * Check if user can see another user's online status
   */
  static async canViewOnlineStatus(
    viewerId: string,
    targetId: string,
    targetSettings: any
  ): Promise<boolean> {
    return this.canViewLastSeen(viewerId, targetId, targetSettings);
  }

  /**
   * Check if sender should see read receipts
   * Returns false if receiver has read receipts OFF
   */
  static async shouldShowReadReceipts(
    senderId: string,
    receiverId: string,
    receiverSettings: any
  ): Promise<boolean> {
    // Check block first
    const canInteract = await this.canInteract(senderId, receiverId);
    if (!canInteract) return false;

    const readReceiptsEnabled = receiverSettings?.read_receipts_enabled !== false;
    return readReceiptsEnabled;
  }
}

/**
 * Presence Service: Online/Offline/Last Seen tracking
 */
export class PresenceService {
  /**
   * Mark user as online
   * Called when app opens or comes to foreground
   */
  static async setOnline(userId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: 'online',
        last_seen: timestamp,
        is_online: true,
      }, {
        onConflict: 'user_id'
      });

    if (error) console.error('Failed to set online:', error);
  }

  /**
   * Mark user as offline and set last_seen
   * Called when app goes to background or user disconnects
   */
  static async setOffline(userId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: 'offline',
        last_seen: timestamp,
        is_online: false,
      }, {
        onConflict: 'user_id'
      });

    if (error) console.error('Failed to set offline:', error);
  }

  /**
   * Get user's current presence with privacy check
   */
  static async getUserPresence(
    userId: string,
    requesterId?: string,
    requesterSettings?: any
  ): Promise<UserPresence | null> {
    // Privacy check if requesterId provided
    if (requesterId) {
      const canView = await PrivacyMiddleware.canViewOnlineStatus(
        requesterId,
        userId,
        requesterSettings
      );
      if (!canView) {
        return null; // Return null instead of data
      }
    }

    const { data } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return data;
  }

  /**
   * Get multiple users' presence (batch query)
   */
  static async getBatchPresence(
    userIds: string[],
    requesterId?: string,
    requesterSettings?: any
  ): Promise<Record<string, UserPresence>> {
    const { data } = await supabase
      .from('user_presence')
      .select('*')
      .in('user_id', userIds);

    const result: Record<string, UserPresence> = {};
    
    for (const presence of data || []) {
      // Apply privacy check
      if (requesterId) {
        const canView = await PrivacyMiddleware.canViewOnlineStatus(
          requesterId,
          presence.user_id,
          requesterSettings
        );
        if (!canView) continue;
      }
      result[presence.user_id] = presence;
    }

    return result;
  }
}

/**
 * Message Status Service: Tick system (✓, ✓✓, ✓✓ Blue)
 */
export class MessageStatusService {
  /**
   * Get visual tick status for a message
   * Returns: 'pending' | 'sent' | 'delivered' | 'read'
   */
  static getTickStatus(message: Message, currentUserId: string): MessageStatus {
    // Only sender sees ticks for their own messages
    if (message.sender_id !== currentUserId) {
      return 'read'; // Receiver doesn't see ticks, message is always "read"
    }

    if (message.is_read) return 'read';         // ✓✓ Blue
    if (message.is_delivered) return 'delivered'; // ✓✓ Gray
    if (message.status === 'sent') return 'sent';  // ✓ Gray
    return 'pending'; // No tick yet
  }

  /**
   * State machine: Update message status (one-way forward only)
   * pending → sent → delivered → read
   */
  static async updateMessageStatus(
    messageId: string,
    newStatus: MessageStatus,
    conversationId: string
  ): Promise<void> {
    const statusMap = {
      pending: 0,
      sent: 1,
      delivered: 2,
      read: 3,
    };

    // Get current status
    const { data: message } = await supabase
      .from('messages')
      .select('status')
      .eq('id', messageId)
      .maybeSingle();

    if (!message) return;

    // Only transition forward
    const currentLevel = statusMap[message.status as MessageStatus] || 0;
    const newLevel = statusMap[newStatus];

    if (newLevel <= currentLevel) return; // Don't downgrade

    // Update with transition flags
    const updateData: any = { status: newStatus };
    if (newStatus === 'sent') {
      updateData.is_sent_at = new Date().toISOString();
    }
    if (newStatus === 'delivered') {
      updateData.is_delivered = true;
      updateData.is_delivered_at = new Date().toISOString();
    }
    if (newStatus === 'read') {
      updateData.is_read = true;
      updateData.is_read_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId);

    if (error) console.error('Failed to update message status:', error);
  }
}

/**
 * Block Service: Blocking with silent message drop
 */
export class BlockService {
  /**
   * Block a user
   */
  static async blockUser(
    blockerId: string,
    blockedId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  /**
   * Unblock a user
   */
  static async unblockUser(
    blockerId: string,
    blockedId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;
  }

  /**
   * Get list of users blocked by someone
   */
  static async getBlockedUsers(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    return data?.map((b: any) => b.blocked_id) || [];
  }

  /**
   * Get list of users who blocked someone
   */
  static async getBlockedByUsers(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', userId);

    return data?.map((b: any) => b.blocker_id) || [];
  }

  /**
   * Check if user is blocked in one direction
   */
  static async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_blocks')
      .select('id', { count: 'exact' })
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    return !!data;
  }
}

/**
 * Badge Count Service: Unread message counter
 */
export class BadgeCountService {
  /**
   * Get unread count for a conversation
   */
  static async getConversationUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    const { data } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', userId);

    return data?.length || 0;
  }

  /**
   * Get total unread count across all conversations (for badge)
   */
  static async getTotalUnreadCount(userId: string): Promise<number> {
    const { data: conversations } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!conversations?.length) return 0;

    const conversationIds = conversations.map((c: any) => c.conversation_id);

    const { data } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    return data?.length || 0;
  }

  /**
   * Reset badge count for a conversation
   */
  static async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        is_delivered: true,
        is_read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) console.error('Failed to mark as read:', error);
  }

  /**
   * Reset badge count globally
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { data: conversations } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!conversations?.length) return;

    const conversationIds = conversations.map((c: any) => c.conversation_id);

    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        is_delivered: true,
        is_read_at: new Date().toISOString(),
      })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) console.error('Failed to mark all as read:', error);
  }
}

/**
 * Message Service: Send/receive with idempotency
 */
export class MessageService {
  /**
   * Send message with idempotent client_id
   * Prevents duplicates on network retry
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    clientId: string, // Unique client-generated ID
    metadata?: Record<string, any>
  ): Promise<Message | null> {
    // Check if already sent (idempotency)
    const { data: existing } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('sender_id', senderId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existing) {
      return existing; // Already sent, return existing
    }

    // Check block BEFORE sending
    const { data: recipients } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);

    for (const recipient of recipients || []) {
      const isBlocked = await BlockService.isBlocked(recipient.user_id, senderId);
      if (isBlocked) {
        console.warn(`Blocked by ${recipient.user_id}, message not sent`);
        return null; // Silent drop - WhatsApp behavior
      }
    }

    // Send message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        client_id: clientId,
        status: 'sent',
        is_sent_at: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      return null;
    }

    return data;
  }

  /**
   * Edit message (only within 15 minutes)
   */
  static async editMessage(
    messageId: string,
    senderId: string,
    newContent: string
  ): Promise<boolean> {
    const { data: message } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .maybeSingle();

    if (!message || message.sender_id !== senderId) return false;

    // Check 15-minute window
    const createdTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - createdTime) / (1000 * 60);

    if (diffMinutes > 15) return false; // Expired

    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    return !error;
  }

  /**
   * Delete for everyone (only within 48 hours)
   */
  static async deleteForEveryone(
    messageId: string,
    senderId: string
  ): Promise<boolean> {
    const { data: message } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .maybeSingle();

    if (!message || message.sender_id !== senderId) return false;

    // Check 48-hour window
    const createdTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const diffHours = (now - createdTime) / (1000 * 60 * 60);

    if (diffHours > 48) return false; // Expired

    const { error } = await supabase
      .from('messages')
      .update({
        deleted_for_all: true,
        content: null,
      })
      .eq('id', messageId);

    return !error;
  }

  /**
   * Delete for me (one-sided, still shows for others)
   */
  static async deleteForMe(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    // Insert into message_deletions table (client-side filter)
    const { error } = await supabase
      .from('message_deletions')
      .insert({
        message_id: messageId,
        user_id: userId,
        deleted_at: new Date().toISOString(),
      });

    return !error;
  }
}

/**
 * Read Receipts Service: Control blue ticks
 */
export class ReadReceiptsService {
  /**
   * Update read receipts setting for a user
   */
  static async setReadReceiptsEnabled(
    userId: string,
    enabled: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        read_receipts_enabled: enabled,
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  }

  /**
   * Get read receipts setting
   */
  static async isReadReceiptsEnabled(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_settings')
      .select('read_receipts_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.read_receipts_enabled !== false; // Default true
  }

  /**
   * Mark messages as read
   * Only if sender has read receipts enabled
   */
  static async markAsRead(
    messageId: string,
    receiverId: string,
    senderSettings: any
  ): Promise<void> {
    const canShowReceipts = await PrivacyMiddleware.shouldShowReadReceipts(
      '', // senderId not used in this context
      receiverId,
      senderSettings
    );

    if (!canShowReceipts) return; // Don't update if read receipts off

    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        is_read_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) console.error('Failed to mark as read:', error);
  }
}

export const RTChatService = {
  privacy: PrivacyMiddleware,
  presence: PresenceService,
  status: MessageStatusService,
  block: BlockService,
  badge: BadgeCountService,
  message: MessageService,
  readReceipts: ReadReceiptsService,
};
