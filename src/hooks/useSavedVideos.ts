import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSavedVideos = () => {
  const { user } = useAuth();

  const { data: savedVideos, isLoading } = useQuery({
    queryKey: ['saved-videos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_videos')
        .select(`
          *,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            views_count,
            duration,
            created_at,
            channels:channel_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { savedVideos, isLoading };
};

export const useIsSaved = (videoId?: string) => {
  const { user } = useAuth();

  const { data: isSaved } = useQuery({
    queryKey: ['is-saved', videoId, user?.id],
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

export const useToggleSaved = () => {
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
    onSuccess: (_, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-videos'] });
      queryClient.invalidateQueries({ queryKey: ['is-saved'] });
      toast.success(isSaved ? 'Removed from Watch Later' : 'Added to Watch Later');
    },
  });
};
