import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch messages for a conversation (filtered by cleared_at)
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId, clearedAt],
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

      // WhatsApp-style: only show messages after cleared_at
      if (clearedAt) {
        query = query.gt('created_at', clearedAt);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId
  });

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType }: { content: string; mediaUrl?: string; mediaType?: string }) => {
      if (!user || !conversationId) throw new Error('Not authenticated or no conversation');

      const messageData: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || null
      };

      // Add media metadata if present
      if (mediaUrl && mediaType) {
        messageData.metadata = { mediaUrl, mediaType };
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // WhatsApp-style clear chat: one-sided, only hides messages for current user
  const clearMessages = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user) throw new Error('No conversation to clear');
      
      // Upsert cleared_at timestamp - messages before this time won't show
      const { error } = await supabase
        .from('chat_clears')
        .upsert(
          {
            user_id: user.id,
            conversation_id: conversationId,
            cleared_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,conversation_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-clear', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Realtime subscription for messages + read receipts
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
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
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  };
};
