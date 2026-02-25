// Video Save/Bookmark Hook - For saved videos section
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useIsSaved = (videoId?: string) => {
  const { user } = useAuth();

  const { data: isSaved } = useQuery({
    queryKey: ['is-video-saved', videoId, user?.id],
    queryFn: async () => {
      if (!user || !videoId) return false;
      
      const { data, error } = await supabase
        .from('saved_videos')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!videoId,
  });

  return isSaved ?? false;
};

export const useToggleSave = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, isSaved }: { videoId: string; isSaved: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isSaved) {
        const { error } = await supabase
          .from('saved_videos')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_videos')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
        
        if (error) throw error;
      }
    },
    onMutate: async ({ videoId, isSaved }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['is-video-saved', videoId] });
      await queryClient.cancelQueries({ queryKey: ['saved-videos'] });

      // Snapshot previous value
      const previousIsSaved = queryClient.getQueryData(['is-video-saved', videoId, user?.id]);

      // Optimistically update
      queryClient.setQueryData(['is-video-saved', videoId, user?.id], !isSaved);

      return { previousIsSaved };
    },
    onError: (err, { videoId }, context) => {
      // Rollback on error
      if (context?.previousIsSaved !== undefined) {
        queryClient.setQueryData(['is-video-saved', videoId, user?.id], context.previousIsSaved);
      }
      toast.error('Failed to save video');
    },
    onSuccess: (_, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-videos'] });
      queryClient.invalidateQueries({ queryKey: ['is-video-saved'] });
      toast.success(isSaved ? 'Removed from Saved' : 'Saved to library');
    },
  });
};
