import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  message_type: 'text' | 'image' | 'file' | 'poll';
  reply_to: string | null;
  is_deleted: boolean;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null; username: string };
}

const PAGE_SIZE = 30;

export const useGroupChat = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const messagesQuery = useInfiniteQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!groupId || !user) return [];
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id, group_id, user_id, content, image_url, file_url, file_name,
          message_type, reply_to, is_deleted, created_at,
          profiles:user_id (display_name, avatar_url, username)
        `)
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data || []) as unknown as GroupMessage[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!groupId && !!user,
  });

  // Flatten messages oldest-first for display
  const messages = messagesQuery.data?.pages.flat().reverse() ?? [];

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      imageUrl,
      fileUrl,
      fileName,
      type = 'text',
      replyTo,
    }: {
      content?: string;
      imageUrl?: string;
      fileUrl?: string;
      fileName?: string;
      type?: GroupMessage['message_type'];
      replyTo?: string;
    }) => {
      if (!user || !groupId) throw new Error('Not ready');
      const { error } = await supabase.from('group_messages').insert({
        group_id: groupId,
        user_id: user.id,
        content: content || null,
        image_url: imageUrl || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        message_type: type,
        reply_to: replyTo || null,
      });
      if (error) throw error;
    },
    onError: (e: any) => toast({ title: 'Send failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] }),
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  // Realtime subscription
  useEffect(() => {
    if (!groupId || !user) return;
    channelRef.current = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [groupId, user, queryClient]);

  return {
    messages,
    isLoading: messagesQuery.isLoading,
    hasMore: !!messagesQuery.hasNextPage,
    loadMore: messagesQuery.fetchNextPage,
    sendMessage,
    deleteMessage,
  };
};
