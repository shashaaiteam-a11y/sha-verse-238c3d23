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

    // Mark all messages in this conversation as read
    const markRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id) // Only mark others' messages as read
        .eq('is_read', false);

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    };

    markRead();
  }, [conversationId, user?.id, queryClient]);
};

// Get total unread message count across all conversations (for bottom nav badge)
export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Realtime: when new message arrives, update unread badge instantly
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Only count messages sent to me (not by me)
        if (payload.new.sender_id !== user.id) {
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      })
      .subscribe();

    return () => {
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
        .update({ is_read: true })
        .eq('id', messageId)
        .neq('sender_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

// Get message read status for display (tick icon)
export const getMessageStatus = (message: {
  sender_id: string;
  is_read?: boolean;
  created_at: string;
}, currentUserId: string): MessageStatus => {
  if (message.sender_id !== currentUserId) return 'read'; // Not my message
  if (message.is_read) return 'read';
  return 'sent';
};
