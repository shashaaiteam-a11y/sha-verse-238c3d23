/**
 * useReadReceipts - Double tick like WhatsApp
 * - Single grey tick = sent
 * - Double grey tick = delivered 
 * - Double blue tick = read
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MessageStatus = 'sent' | 'delivered' | 'read';

// Mark messages as read when user opens a conversation
export const useMarkMessagesRead = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    // Mark all unread messages in this conversation as read in a SINGLE batch UPDATE
    const markRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, is_delivered: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id) // Only mark others' messages as read
        .eq('is_read', false);

      if (error) return;

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
    };

    // Run once when the chat opens
    void markRead();

    // 🚀 Re-run a single batch UPDATE when the screen/tab regains focus, so any
    // messages received while the user was away get marked read in one batch.
    const handleFocus = () => {
      if (!document.hidden) void markRead();
    };
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversationId, user?.id, queryClient]);
};

// Get total unread message count across all conversations (for bottom nav badge)
export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // 🚀 OPTIMIZATION: Debounced updates to prevent storm
    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 1500;

    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Update unread counts (immediate need)
        queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
        // Delay conversation list update (less critical)
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      }, DEBOUNCE_MS);
    };

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`unread-messages-${user.id}-${suffix}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Only count messages sent to me (not by me)
        if (payload.new.sender_id !== user.id) {
          debouncedUpdate();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, () => {
        debouncedUpdate();
      })
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};

// Mark a single message as read
export const useMarkMessageRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, is_delivered: true })
        .eq('id', messageId)
        .neq('sender_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user?.id] });
    },
  });
};

// Get message read status for display (tick icon)
export const getMessageStatus = (message: {
  sender_id: string;
  is_read?: boolean;
  is_delivered?: boolean;
  created_at: string;
}, currentUserId: string): MessageStatus => {
  if (message.sender_id !== currentUserId) return 'read'; // Not my message
  if (message.is_read) return 'read';
  if (message.is_delivered) return 'delivered';
  return 'sent';
};

// Auto-mark incoming messages as delivered when app/conversation list loads
export const useMarkMessagesDelivered = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const invalidateDeliveryState = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      // 🚀 Removed broad ['messages'] invalidation - was reloading ALL messages
      queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
    };

    const markDelivered = async (messageId?: string) => {
      if (messageId) {
        const { error } = await supabase
          .from('messages')
          .update({ is_delivered: true })
          .eq('id', messageId)
          .neq('sender_id', user.id)
          .eq('is_delivered', false);

        if (!error) invalidateDeliveryState();
        return;
      }

      const { data: memberData, error: membersError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (membersError || !memberData?.length) return;

      const conversationIds = memberData
        .map((member: { conversation_id: string | null }) => member.conversation_id)
        .filter(Boolean);

      if (conversationIds.length === 0) return;

      const { error } = await supabase
        .from('messages')
        .update({ is_delivered: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('is_delivered', false);

      if (!error) invalidateDeliveryState();
    };

    void markDelivered();

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`message-delivery-${user.id}-${suffix}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        if (payload.new.sender_id === user.id || payload.new.is_delivered) return;
        void markDelivered(payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};
