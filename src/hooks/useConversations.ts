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
      if (!data || data.length === 0) return [];

      const conversationIds = data.map((cm: any) => cm.conversation_id);

      // 🚀 OPTIMIZATION: Fetch ALL members and last messages in parallel (2 queries total instead of 2N)
      const [{ data: allMembers }, { data: allLastMessages }] = await Promise.all([
        // Get all members for all conversations in ONE query
        supabase
          .from('conversation_members')
          .select(`
            conversation_id,
            user_id,
            profiles:user_id (
              id,
              display_name,
              username,
              avatar_url
            )
          `)
          .in('conversation_id', conversationIds)
          .neq('user_id', user.id),
        
        // Get last messages for all conversations using a single RPC or query
        // Using a supabase function or fetching recent messages for all convos
        supabase
          .from('messages')
          .select('id, conversation_id, content, created_at, sender_id, is_read, is_delivered')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      ]);

      // Create a map for efficient lookup
      const membersByConversation: Record<string, any[]> = {};
      allMembers?.forEach((m: any) => {
        if (!membersByConversation[m.conversation_id]) {
          membersByConversation[m.conversation_id] = [];
        }
        membersByConversation[m.conversation_id].push(m.profiles);
      });

      // Get only the latest message per conversation
      const lastMessageByConversation: Record<string, any> = {};
      allLastMessages?.forEach((msg: any) => {
        if (!lastMessageByConversation[msg.conversation_id]) {
          lastMessageByConversation[msg.conversation_id] = msg;
        }
      });

      // Combine data
      const conversationsWithMembers = data.map((cm: any) => ({
        ...cm.conversations,
        otherMembers: membersByConversation[cm.conversation_id] || [],
        lastMessage: lastMessageByConversation[cm.conversation_id] || null
      }));

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
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user?.id] });
    }
  });

  // 🚀 OPTIMIZATION: Use debounced updates for conversations
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 2000;

    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Only update unread counts immediately - conversations list less critical
        queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
        queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        // Delay conversation list update to reduce load
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      }, DEBOUNCE_MS);
    };

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`conversations-updates-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Unread counters must update instantly, conversation list debounced
          queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          debouncedUpdate();
        }
      )
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    conversations,
    isLoading,
    startConversation
  };
};
