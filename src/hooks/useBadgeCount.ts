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
    refetchInterval: 15000, // Lightweight safety net; realtime is primary
    staleTime: 2000,
  });

  // Real-time subscription to new messages (Chats only)
  useEffect(() => {
    if (!user?.id) return;

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`unread-badge-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.new?.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
            queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
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
 * Mark conversation as fully read (WhatsApp-style instant reset)
 */
export const useMarkConversationRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await RTChatService.badge.markConversationAsRead(conversationId, user.id);
      return conversationId;
    },
    // Optimistic update so the green badge disappears the instant a chat is opened
    onMutate: async (conversationId) => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: ['unread-counts-all', user.id] });
      const prevAll = queryClient.getQueryData<Record<string, number>>(
        ['unread-counts-all', user.id]
      );

      // Zero this chat's badge immediately + drop total by that delta
      queryClient.setQueriesData<Record<string, number>>(
        { queryKey: ['unread-counts-all', user.id] },
        (old) => {
          if (!old) return old;
          const next = { ...old };
          delete next[conversationId];
          return next;
        }
      );
      queryClient.setQueryData(['conversation-unread-badge', conversationId, user.id], 0);

      const droppedBy = prevAll?.[conversationId] || 0;
      if (droppedBy > 0) {
        queryClient.setQueryData<number>(['unread-badge', user.id], (old = 0) =>
          Math.max(0, (old || 0) - droppedBy)
        );
      }

      return { prevAll };
    },
    onError: (_err, _conversationId, context) => {
      // Roll back on failure
      if (context?.prevAll && user?.id) {
        queryClient.setQueryData(['unread-counts-all', user.id], context.prevAll);
      }
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
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
    onMutate: async () => {
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: ['unread-counts-all', user.id] });
      const prevAll = queryClient.getQueryData(['unread-counts-all', user.id]);
      queryClient.setQueryData(['unread-counts-all', user.id], {});
      queryClient.setQueryData(['unread-badge', user.id], 0);
      return { prevAll };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevAll && user?.id) {
        queryClient.setQueryData(['unread-counts-all', user.id], context.prevAll);
      }
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-realtime'] });
    }
  });
};
