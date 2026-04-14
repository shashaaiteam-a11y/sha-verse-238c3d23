/**
 * useMessagesRealtime - Enhanced messages hook with real-time ticks & privacy
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
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

  // Fetch messages with real-time updates
  const { data: messages, isLoading } = useQuery({
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
      
      // Filter out deleted-for-me messages
      if (user?.id) {
        const { data: deletions } = await (supabase as any)
          .from('message_deletions')
          .select('message_id')
          .eq('user_id', user.id);

        const deletedIds = new Set(deletions?.map((d: any) => d.message_id) || []);
        return (data || []).filter((m: any) => !deletedIds.has(m.id));
      }

      return data || [];
    },
    enabled: !!conversationId
  });

  // Send message with idempotency
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      mediaUrl,
      mediaType,
    }: {
      content: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      if (!user || !conversationId) throw new Error('Not authenticated');

      const clientId = crypto.randomUUID();
      
      const metadata = mediaUrl && mediaType ? { mediaUrl, mediaType } : undefined;

      const message = await RTChatService.message.sendMessage(
        conversationId,
        user.id,
        content,
        clientId,
        metadata
      );

      if (!message) {
        throw new Error('Message blocked (user may have blocked you)');
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user?.id] });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    }
  });

  // Auto-mark messages as read when conversation is opened
  useEffect(() => {
    if (!conversationId || !user?.id || !readReceiptsEnabled) return;

    const markAsRead = async () => {
      await RTChatService.badge.markConversationAsRead(conversationId, user.id);
      queryClient.invalidateQueries({ queryKey: ['messages-realtime', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
    };

    const timer = setTimeout(markAsRead, 500);
    return () => clearTimeout(timer);
  }, [conversationId, user?.id, readReceiptsEnabled, queryClient]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-rt-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.new?.sender_id !== user?.id) {
            queryClient.invalidateQueries({
              queryKey: ['messages-realtime', conversationId]
            });
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
