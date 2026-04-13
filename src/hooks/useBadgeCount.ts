/**
 * useBadgeCount - Unread message badge count with real-time sync
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { RTChatService } from '@/services/RTChatService';

/**
 * Get total unread count (for app icon badge)
 */
export const useTotalUnreadBadge = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: totalUnread = 0 } = useQuery({
    queryKey: ['unread-badge', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      return RTChatService.badge.getTotalUnreadCount(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Real-time subscription to new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unread-badge-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Only increment if message is NOT from current user
          if (payload.new?.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'is_read=eq.true',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return totalUnread;
};

/**
 * Get unread count for a specific conversation
 */
export const useConversationUnreadBadge = (conversationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ['conversation-unread-badge', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user?.id) return 0;
      return RTChatService.badge.getConversationUnreadCount(conversationId, user.id);
    },
    enabled: !!conversationId && !!user?.id,
    refetchInterval: 5000,
  });

  // Real-time updates for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-unread-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['conversation-unread-badge', conversationId]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return unread;
};

/**
 * Mark conversation as fully read
 */
export const useMarkConversationRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await RTChatService.badge.markConversationAsRead(conversationId, user.id);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    }
  });
};

/**
 * Mark all conversations as read
 */
export const useMarkAllConversationsRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      await RTChatService.badge.markAllAsRead(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    }
  });
};
