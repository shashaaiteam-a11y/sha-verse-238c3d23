/**
 * useMessagesRealtime - Enhanced messages hook with real-time ticks & privacy
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { RTChatService } from '@/services/RTChatService';

export const useMessagesRealtime = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);

  // Get cleared_at timestamp for this user in this conversation
  const { data: clearedAt } = useQuery({
    queryKey: ['chat-clear', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user) return null;
      const { data } = await supabase
        .from('chat_clears')
        .select('cleared_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.cleared_at || null;
    },
    enabled: !!conversationId && !!user,
  });

  // Get read receipts setting
  useEffect(() => {
    const getReceiptsSetting = async () => {
      if (!user?.id) return;
      const enabled = await RTChatService.readReceipts.isReadReceiptsEnabled(user.id);
      setReadReceiptsEnabled(enabled);
    };
    getReceiptsSetting();
  }, [user?.id]);

  // Perf: "deleted for me" ids are per-user and change rarely, so fetch them in
  // their own cached query instead of re-running this query serially on every
  // single message refetch (previously doubled the round-trip on each receive).
  const { data: deletedIds } = useQuery({
    queryKey: ['message-deletions', user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data } = await (supabase as any)
        .from('message_deletions')
        .select('message_id')
        .eq('user_id', user.id);
      return new Set<string>((data || []).map((d: any) => d.message_id));
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Fetch messages with real-time updates
  const { data: rawMessages, isLoading } = useQuery({
    queryKey: ['messages-realtime', conversationId, clearedAt, user?.id],
    queryFn: async () => {
      if (!conversationId) return [];

      let query = supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Only show messages after cleared_at (WhatsApp style)
      if (clearedAt) {
        query = query.gt('created_at', clearedAt);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId
  });

  // Filter out "deleted for me" messages client-side using the cached set.
  // Same output structure as before (array of message rows).
  const messages = useMemo(() => {
    if (!deletedIds || deletedIds.size === 0) return rawMessages || [];
    return (rawMessages || []).filter((m: any) => !deletedIds.has(m.id));
  }, [rawMessages, deletedIds]);

  // Send message with idempotency
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      mediaUrl,
      mediaType,
      replyTo,
    }: {
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      /** Optional reply context — id of the message being replied to. */
      replyTo?: {
        id: string;
        senderName: string;
        content: string | null;
      } | null;
    }) => {
      if (!user || !conversationId) throw new Error('Not authenticated');

      const clientId = crypto.randomUUID();

      const metadata: Record<string, any> = {};
      if (mediaUrl && mediaType) {
        metadata.mediaUrl = mediaUrl;
        metadata.mediaType = mediaType;
      }
      if (replyTo) {
        metadata.replyTo = {
          id: replyTo.id,
          senderName: replyTo.senderName,
          content: replyTo.content,
        };
      }

      const message = await RTChatService.message.sendMessage(
        conversationId,
        user.id,
        content,
        clientId,
        Object.keys(metadata).length > 0 ? metadata : undefined
      );

      if (!message) {
        throw new Error('Message blocked (user may have blocked you)');
      }

      return message;
    },
    // Optimistic update: show the sent message instantly (WhatsApp-style) so the
    // sender never waits for the server round-trip + realtime echo + refetch.
    onMutate: async ({ content, mediaUrl, mediaType, replyTo }) => {
      if (!user || !conversationId) return;
      await queryClient.cancelQueries({ queryKey: ['messages-realtime', conversationId] });

      const metadata: Record<string, any> = {};
      if (mediaUrl && mediaType) {
        metadata.mediaUrl = mediaUrl;
        metadata.mediaType = mediaType;
      }
      if (replyTo) {
        metadata.replyTo = { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.content };
      }

      const optimisticMessage = {
        id: `optimistic-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        created_at: new Date().toISOString(),
        profiles: null,
        _optimistic: true,
      };

      const previous = queryClient.getQueriesData({ queryKey: ['messages-realtime', conversationId] });
      queryClient.setQueriesData(
        { queryKey: ['messages-realtime', conversationId] },
        (old: any) => (Array.isArray(old) ? [...old, optimisticMessage] : old),
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
    },
    onError: (error, _vars, context: any) => {
      // Roll back the optimistic message on failure so nothing is left stranded.
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      console.error('Failed to send message:', error);
    },
  });

  // Auto-mark messages as read when conversation is opened (WhatsApp behavior).
  // Uses secure RPC under the hood, so it works even without per-row UPDATE permission.
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const markAsRead = async () => {
      try {
        await RTChatService.badge.markConversationAsRead(conversationId, user.id);
      } catch (e) {
        console.error('[useMessagesRealtime] auto mark-as-read failed:', e);
      }
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge', conversationId] });
    };

    // Run immediately on open + small follow-up to catch any messages that arrived
    // during the same tick as the open.
    markAsRead();
    const timer = setTimeout(markAsRead, 600);
    return () => clearTimeout(timer);
  }, [conversationId, user?.id, queryClient]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`messages-rt-${conversationId}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload: any) => {
          queryClient.invalidateQueries({
            queryKey: ['messages-realtime', conversationId]
          });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
          queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge', conversationId, user.id] });

          // WhatsApp parity: if a new INCOMING message arrives while this chat
          // is the active open chat, mark conversation as read instantly so the
          // sender sees blue ticks without needing a re-open.
          if (payload?.new?.sender_id && payload.new.sender_id !== user.id) {
            try {
              await RTChatService.badge.markConversationAsRead(conversationId, user.id);
            } catch (e) {
              // best-effort; auto-read on open will retry
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['messages-realtime', conversationId]
          });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
          queryClient.invalidateQueries({ queryKey: ['conversation-unread-badge', conversationId, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, queryClient]);

  // Get unread count for this conversation
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['conversation-unread', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user?.id) return 0;
      return RTChatService.badge.getConversationUnreadCount(conversationId, user.id);
    },
    enabled: !!conversationId && !!user?.id,
    refetchInterval: 5000,
  });

  // Clear chat (one-sided, WhatsApp style)
  const clearMessages = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user) throw new Error('No conversation');
      const { error } = await supabase
        .from('chat_clears')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          cleared_at: new Date().toISOString(),
        }, { onConflict: 'user_id,conversation_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-clear', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
    }
  });

  // Edit message (15 minute window)
  const editMessage = useMutation({
    mutationFn: async ({
      messageId,
      newContent,
    }: {
      messageId: string;
      newContent: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const success = await RTChatService.message.editMessage(
        messageId,
        user.id,
        newContent
      );
      if (!success) throw new Error('Cannot edit message (expired or not yours)');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
    }
  });

  // Delete for everyone (48 hour window)
  const deleteForEveryone = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const success = await RTChatService.message.deleteForEveryone(messageId, user.id);
      if (!success) throw new Error('Cannot delete message (expired or not yours)');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
    }
  });

  // Delete for me (client-side only, one-sided)
  const deleteForMe = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const success = await RTChatService.message.deleteForMe(messageId, user.id);
      if (!success) throw new Error('Failed to delete message');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-deletions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
    }
  });

  // Get message tick status
  const getMessageTicks = (message: any) => {
    if (!message) return 'pending';
    return RTChatService.status.getTickStatus(message, user?.id || '');
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    unreadCount,
    isTyping,
    setIsTyping,
    readReceiptsEnabled,
    getMessageTicks,
  };
};
