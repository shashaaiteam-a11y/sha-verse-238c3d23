import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations (
            id,
            title,
            is_group,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get the other member's profile for each conversation
      const conversationsWithMembers = await Promise.all(
        (data || []).map(async (cm: any) => {
          const { data: members } = await supabase
            .from('conversation_members')
            .select(`
              user_id,
              profiles:user_id (
                id,
                display_name,
                username,
                avatar_url
              )
            `)
            .eq('conversation_id', cm.conversation_id)
            .neq('user_id', user.id);

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', cm.conversation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...cm.conversations,
            otherMembers: members?.map((m: any) => m.profiles) || [],
            lastMessage
          };
        })
      );

      return conversationsWithMembers;
    },
    enabled: !!user
  });

  // Create or get existing conversation with a user
  const startConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to send messages');
      }

      // Use edge function to create conversation (bypasses RLS issues)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ otherUserId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start conversation');
      }

      return result.conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Realtime subscription for conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    conversations,
    isLoading,
    startConversation
  };
};
