/**
 * RTChatService - Real-Time Chat Service (WhatsApp Architecture)
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

export class PrivacyMiddleware {
  static async canInteract(fromUserId: string, toUserId: string): Promise<boolean> {
    const { data } = await (supabase as any)
      .from('user_blocks')
      .select('id', { count: 'exact' })
      .eq('blocker_id', toUserId)
      .eq('blocked_id', fromUserId)
      .maybeSingle();

    return !data;
  }

  static async canViewLastSeen(
    viewerId: string,
    targetId: string,
    targetSettings: any
  ): Promise<boolean> {
    const canInteract = await this.canInteract(viewerId, targetId);
    if (!canInteract) return false;

    const lastSeenVisibility = targetSettings?.last_seen_visibility || 'everyone';
    
    if (lastSeenVisibility === 'nobody') return false;
    if (lastSeenVisibility === 'everyone') return true;
    
    // 'contacts': check if mutual contacts via friendships table
    const { data: contact } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', viewerId)
      .eq('friend_id', targetId)
      .eq('status', 'accepted')
      .maybeSingle();

    return !!contact;
  }

  static async canViewOnlineStatus(
    viewerId: string,
    targetId: string,
    targetSettings: any
  ): Promise<boolean> {
    return this.canViewLastSeen(viewerId, targetId, targetSettings);
  }

  static async shouldShowReadReceipts(
    senderId: string,
    receiverId: string,
    receiverSettings: any
  ): Promise<boolean> {
    const canInteract = await this.canInteract(senderId, receiverId);
    if (!canInteract) return false;

    const readReceiptsEnabled = receiverSettings?.read_receipts_enabled !== false;
    return readReceiptsEnabled;
  }
}

export class PresenceService {
  static async setOnline(userId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const { error } = await (supabase as any)
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

  static async setOffline(userId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const { error } = await (supabase as any)
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

  static async getUserPresence(
    userId: string,
    _requesterId?: string,
    _requesterSettings?: any
  ): Promise<UserPresence | null> {
    // Privacy is enforced server-side via SECURITY DEFINER RPC
    // (block check + last_seen_visibility + online_status_visibility + give-and-take rule)
    const { data, error } = await (supabase as any).rpc('get_user_presence_safe', {
      _target_user_id: userId,
    });

    if (error) {
      console.error('[PresenceService] get_user_presence_safe failed:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      user_id: row.user_id,
      status: row.status ?? (row.is_online ? 'online' : 'offline'),
      last_seen: row.last_seen,
      is_online: !!row.is_online,
    };
  }

  static async getBatchPresence(
    userIds: string[],
    requesterId?: string,
    requesterSettings?: any
  ): Promise<Record<string, UserPresence>> {
    const { data } = await (supabase as any)
      .from('user_presence')
      .select('*')
      .in('user_id', userIds);

    const result: Record<string, UserPresence> = {};
    
    for (const presence of data || []) {
      if (requesterId) {
        const canView = await PrivacyMiddleware.canViewOnlineStatus(
          requesterId,
          presence.user_id,
          requesterSettings
        );
        if (!canView) continue;
      }
      result[presence.user_id] = {
        user_id: presence.user_id,
        status: presence.status,
        last_seen: presence.last_seen,
        is_online: presence.is_online,
      };
    }

    return result;
  }
}

export class MessageStatusService {
  static getTickStatus(message: any, currentUserId: string): MessageStatus {
    if (message.sender_id !== currentUserId) {
      return 'read';
    }

    if (message.is_read) return 'read';
    if (message.is_delivered) return 'delivered';
    if (message.status === 'sent') return 'sent';
    return 'pending';
  }

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

    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle();

    if (!message) return;

    const currentLevel = statusMap[(message as any).status as MessageStatus] || 0;
    const newLevel = statusMap[newStatus];

    if (newLevel <= currentLevel) return;

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
      .update(updateData as any)
      .eq('id', messageId);

    if (error) console.error('Failed to update message status:', error);
  }
}

export class BlockService {
  static async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('user_blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  static async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;
  }

  static async getBlockedUsers(userId: string): Promise<string[]> {
    const { data } = await (supabase as any)
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    return data?.map((b: any) => b.blocked_id) || [];
  }

  static async getBlockedByUsers(userId: string): Promise<string[]> {
    const { data } = await (supabase as any)
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', userId);

    return data?.map((b: any) => b.blocker_id) || [];
  }

  static async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const { data } = await (supabase as any)
      .from('user_blocks')
      .select('id', { count: 'exact' })
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    return !!data;
  }
}

export class BadgeCountService {
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

  static async markConversationAsRead(
    conversationId: string,
    _userId: string
  ): Promise<void> {
    // Use SECURITY DEFINER RPC: messages.is_read can only be updated by sender
    // under the row-level rules, so we bypass via a server-side function that
    // verifies membership and marks incoming messages read for the caller.
    const { error } = await (supabase as any).rpc('mark_conversation_as_read', {
      _conversation_id: conversationId,
    });

    if (error) {
      console.error('[BadgeCountService] mark_conversation_as_read RPC failed:', error);
      throw error;
    }
  }

  static async markAllAsRead(_userId: string): Promise<void> {
    const { error } = await (supabase as any).rpc('mark_all_conversations_read');

    if (error) {
      console.error('[BadgeCountService] mark_all_conversations_read RPC failed:', error);
      throw error;
    }
  }
}

export class MessageService {
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    clientId: string,
    metadata?: Record<string, any>
  ): Promise<Message | null> {
    // Check block BEFORE sending.
    // Perf: resolve recipients + block state in 2 parallel-free round-trips
    // instead of an N+1 loop (1 members query + 1 block check per recipient).
    const { data: recipients } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);

    const recipientIds = (recipients || [])
      .map((r: any) => r.user_id)
      .filter(Boolean);

    if (recipientIds.length > 0) {
      // Single query: has ANY recipient blocked the sender?
      const { data: blocks } = await (supabase as any)
        .from('user_blocks')
        .select('blocker_id')
        .in('blocker_id', recipientIds)
        .eq('blocked_id', senderId)
        .limit(1);

      if (blocks && blocks.length > 0) {
        console.warn('Blocked by a recipient, message not sent');
        return null;
      }
    }

    // Send message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        is_delivered: false,
        is_read: false,
        metadata,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      return null;
    }

    const row = data as any;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      content: row.content,
      status: row.status || 'sent',
      is_read: row.is_read,
      is_delivered: row.is_delivered,
      created_at: row.created_at,
      edited_at: row.edited_at,
      deleted_for_all: row.deleted_for_all,
      metadata: row.metadata,
      client_id: row.client_id,
    };
  }

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

    const createdTime = new Date(message.created_at!).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - createdTime) / (1000 * 60);

    if (diffMinutes > 15) return false;

    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        edited: true,
      } as any)
      .eq('id', messageId);

    return !error;
  }

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

    const createdTime = new Date(message.created_at!).getTime();
    const now = new Date().getTime();
    const diffHours = (now - createdTime) / (1000 * 60 * 60);

    if (diffHours > 48) return false;

    const { error } = await supabase
      .from('messages')
      .update({
        content: null,
      } as any)
      .eq('id', messageId);

    return !error;
  }

  static async deleteForMe(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    const { error } = await (supabase as any)
      .from('message_deletions')
      .insert({
        message_id: messageId,
        user_id: userId,
        deleted_at: new Date().toISOString(),
      });

    return !error;
  }
}

export class ReadReceiptsService {
  static async setReadReceiptsEnabled(
    userId: string,
    enabled: boolean
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from('user_settings')
      .upsert({
        user_id: userId,
        read_receipts_enabled: enabled,
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  }

  static async isReadReceiptsEnabled(userId: string): Promise<boolean> {
    const { data } = await (supabase as any)
      .from('user_settings')
      .select('read_receipts_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    return data?.read_receipts_enabled !== false;
  }

  static async markAsRead(
    messageId: string,
    receiverId: string,
    senderSettings: any
  ): Promise<void> {
    const canShowReceipts = await PrivacyMiddleware.shouldShowReadReceipts(
      '',
      receiverId,
      senderSettings
    );

    if (!canShowReceipts) return;

    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
      } as any)
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
