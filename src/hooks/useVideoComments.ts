import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useVideoComments = (videoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !videoId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          video_id: videoId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      // comments_count is auto-synced by database trigger
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Comment added!');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      // comments_count is auto-synced by database trigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Comment deleted');
    },
  });

  // Realtime: video comments live update - like YouTube live chat
  useEffect(() => {
    if (!videoId) return;

    const channel = supabase
      .channel(`video-comments-${videoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `video_id=eq.${videoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `video_id=eq.${videoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, queryClient]);

  return { comments, isLoading, addComment, deleteComment };
};
