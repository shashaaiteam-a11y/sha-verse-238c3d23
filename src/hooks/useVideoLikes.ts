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

      // 1. If currently disliked, remove dislike first
      if (isDisliked) {
        await supabase
          .from('video_dislikes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      }

      // 2. toggle like row
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
        
        if (error) throw error;
      }
      // likes_count is auto-synced by database trigger
    },
    // Optimistic updates for instant UI feedback
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['video-like', videoId] });
      await queryClient.cancelQueries({ queryKey: ['video', videoId] });
      await queryClient.cancelQueries({ queryKey: ['shorts'] });
      await queryClient.cancelQueries({ queryKey: ['videos'] });
      
      const previousLiked = queryClient.getQueryData(['video-like', videoId, user?.id]);
      const previousVideo = queryClient.getQueryData(['video', videoId]);
      const previousShorts = queryClient.getQueryData(['shorts']);
      const previousVideos = queryClient.getQueryData(['videos']);
      
      queryClient.setQueryData(['video-like', videoId, user?.id], !isLiked);
      
      // Optimistically update counts on single video
      if (previousVideo) {
        queryClient.setQueryData(['video', videoId], (old: any) => ({
          ...old,
          likes_count: isLiked 
            ? Math.max(0, (old?.likes_count || 0) - 1) 
            : (old?.likes_count || 0) + 1
        }));
      }

      // Optimistically update shorts list
      queryClient.setQueryData(['shorts'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((v: any) => 
          v.id === videoId ? { ...v, likes_count: isLiked ? Math.max(0, (v.likes_count || 0) - 1) : (v.likes_count || 0) + 1 } : v
        );
      });

      // Optimistically update videos list
      queryClient.setQueryData(['videos'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((v: any) => 
          v.id === videoId ? { ...v, likes_count: isLiked ? Math.max(0, (v.likes_count || 0) - 1) : (v.likes_count || 0) + 1 } : v
        );
      });

      // If removing like and had been disliked, also clear dislike optimistically
      if (isDisliked) {
        queryClient.setQueryData(['video-dislike', videoId, user?.id], false);
      }
      
      return { previousLiked, previousVideo, previousShorts, previousVideos };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['video-like', videoId, user?.id], context?.previousLiked);
      queryClient.setQueryData(['video', videoId], context?.previousVideo);
      if (context?.previousShorts) queryClient.setQueryData(['shorts'], context.previousShorts);
      if (context?.previousVideos) queryClient.setQueryData(['videos'], context.previousVideos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['video-like', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-dislike', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const toggleDislike = useMutation({
    mutationFn: async () => {
      if (!user || !videoId) throw new Error('Not authenticated');

      // 1. If currently liked, remove like first
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      }

      // 2. toggle dislike row
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
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['video-dislike', videoId] });
      await queryClient.cancelQueries({ queryKey: ['shorts'] });
      await queryClient.cancelQueries({ queryKey: ['videos'] });

      const previousDisliked = queryClient.getQueryData(['video-dislike', videoId, user?.id]);
      const previousShorts = queryClient.getQueryData(['shorts']);
      const previousVideos = queryClient.getQueryData(['videos']);

      queryClient.setQueryData(['video-dislike', videoId, user?.id], !isDisliked);

      // If adding dislike, also clear like optimistically  
      if (isLiked) {
        queryClient.setQueryData(['video-like', videoId, user?.id], false);
      }

      return { previousDisliked, previousShorts, previousVideos };
    },
    onError: (err, _, context) => {
      if (context?.previousDisliked !== undefined) queryClient.setQueryData(['video-dislike', videoId, user?.id], context.previousDisliked);
      if (context?.previousShorts) queryClient.setQueryData(['shorts'], context.previousShorts);
      if (context?.previousVideos) queryClient.setQueryData(['videos'], context.previousVideos);
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
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_dislikes',
        filter: `video_id=eq.${videoId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['video-dislike', videoId] });
        queryClient.invalidateQueries({ queryKey: ['video', videoId] });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.invalidateQueries({ queryKey: ['shorts'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, queryClient]);

  return { isLiked: isLiked ?? false, isDisliked: isDisliked ?? false, toggleLike, toggleDislike };
};
