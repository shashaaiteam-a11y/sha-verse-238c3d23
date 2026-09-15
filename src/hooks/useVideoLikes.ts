import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMovionRealtime } from '@/hooks/useMovionRealtime';
import { toast } from 'sonner';

export const useVideoLike = (videoId?: string) => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  useMovionRealtime();
  const liked = useQuery({
    queryKey: ['video-like', videoId, userId], enabled: !!userId && !!videoId,
    queryFn: async () => {
      const { data, error } = await supabase.from('likes').select('id').eq('user_id',userId!).eq('video_id',videoId!).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const disliked = useQuery({
    queryKey: ['video-dislike', videoId, userId], enabled: !!userId && !!videoId,
    queryFn: async () => {
      const { data, error } = await supabase.from('video_dislikes').select('id').eq('user_id',userId!).eq('video_id',videoId!).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const mutationKey = ['video-reaction',videoId,userId];
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: async (reaction: 'like' | 'dislike' | null) => {
      if (!userId || !videoId) throw new Error('Please sign in to react');
      const { data, error } = await supabase.rpc('set_video_reaction',{ _video_id: videoId,_reaction: reaction });
      if (error) throw error;
      return data as { liked: boolean; disliked: boolean };
    },
    onSuccess: data => {
      queryClient.setQueryData(['video-like',videoId,userId],data.liked);
      queryClient.setQueryData(['video-dislike',videoId,userId],data.disliked);
    },
    onError: error => toast.error(error.message || 'Unable to update reaction'),
    onSettled: () => {
      for (const key of ['video-like','video-dislike','video','videos','shorts','channel-videos','channel-watch-analytics']) {
        void queryClient.invalidateQueries({queryKey:[key]});
      }
    },
  });
  const toggle = (kind: 'like' | 'dislike') => {
    if (queryClient.isMutating({ mutationKey })) return;
    if (userId && (!liked.isSuccess || !disliked.isSuccess)) { toast.error('Reaction status unavailable. Please retry.'); return; }
    mutation.mutate((kind === 'like' ? liked.data : disliked.data) ? null : kind);
  };
  return { isLiked: !!userId && (liked.data ?? false), isDisliked: !!userId && (disliked.data ?? false),
    toggleLike: { mutate: () => toggle('like'), isPending: pending },
    toggleDislike: { mutate: () => toggle('dislike'), isPending: pending },
  };
};
