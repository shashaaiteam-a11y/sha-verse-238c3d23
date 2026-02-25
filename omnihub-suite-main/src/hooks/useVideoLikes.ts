import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVideoLike = (videoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isLiked } = useQuery({
    queryKey: ['video-like', videoId, user?.id],
    queryFn: async () => {
      if (!user || !videoId) return false;
      
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!videoId,
  });

  const { data: isDisliked } = useQuery({
    queryKey: ['video-dislike', videoId, user?.id],
    queryFn: async () => {
      if (!user || !videoId) return false;
      
      const { data, error } = await supabase
        .from('video_dislikes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!videoId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user || !videoId) throw new Error('Not authenticated');

      // Remove dislike if exists
      if (isDisliked) {
        await supabase
          .from('video_dislikes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      }

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;

        // Update likes count
        const { data: video } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', videoId)
          .single();

        if (video) {
          await supabase
            .from('videos')
            .update({ likes_count: Math.max(0, (video.likes_count || 0) - 1) })
            .eq('id', videoId);
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
        
        if (error) throw error;

        // Update likes count
        const { data: video } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', videoId)
          .single();

        if (video) {
          await supabase
            .from('videos')
            .update({ likes_count: (video.likes_count || 0) + 1 })
            .eq('id', videoId);
        }
      }
    },
    // Optimistic updates for instant UI feedback
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['video-like', videoId] });
      await queryClient.cancelQueries({ queryKey: ['video', videoId] });
      
      // Snapshot the previous value
      const previousLiked = queryClient.getQueryData(['video-like', videoId, user?.id]);
      const previousVideo = queryClient.getQueryData(['video', videoId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['video-like', videoId, user?.id], !isLiked);
      
      // Optimistically update video likes count
      if (previousVideo) {
        queryClient.setQueryData(['video', videoId], (old: any) => ({
          ...old,
          likes_count: isLiked 
            ? Math.max(0, (old?.likes_count || 0) - 1) 
            : (old?.likes_count || 0) + 1
        }));
      }
      
      return { previousLiked, previousVideo };
    },
    onError: (err, _, context) => {
      // Rollback on error
      queryClient.setQueryData(['video-like', videoId, user?.id], context?.previousLiked);
      queryClient.setQueryData(['video', videoId], context?.previousVideo);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-like', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-dislike', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  const toggleDislike = useMutation({
    mutationFn: async () => {
      if (!user || !videoId) throw new Error('Not authenticated');

      // Remove like if exists
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        // Decrease likes count
        const { data: video } = await supabase
          .from('videos')
          .select('likes_count')
          .eq('id', videoId)
          .single();

        if (video) {
          await supabase
            .from('videos')
            .update({ likes_count: Math.max(0, (video.likes_count || 0) - 1) })
            .eq('id', videoId);
        }
      }

      if (isDisliked) {
        const { error } = await supabase
          .from('video_dislikes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('video_dislikes')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-like', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-dislike', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  // Realtime: video likes live - jaise YouTube me live like count
  useEffect(() => {
    if (!videoId) return;

    const channel = supabase
      .channel(`video-likes-${videoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `video_id=eq.${videoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['video-like', videoId] });
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_dislikes',
        filter: `video_id=eq.${videoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['video-dislike', videoId] });
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, queryClient]);

  return { isLiked: isLiked ?? false, isDisliked: isDisliked ?? false, toggleLike, toggleDislike };
};
