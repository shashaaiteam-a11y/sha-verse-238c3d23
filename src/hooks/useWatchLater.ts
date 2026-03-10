import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useWatchLater = () => {
  const { user } = useAuth();

  const { data: watchLater, isLoading } = useQuery({
    queryKey: ['watch-later', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('watch_later')
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
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { watchLater, isLoading };
};

export const useIsInWatchLater = (videoId?: string) => {
  const { user } = useAuth();

  const { data: isInWatchLater } = useQuery({
    queryKey: ['is-watch-later', videoId, user?.id],
    queryFn: async () => {
      if (!user || !videoId) return false;
      
      const { data, error } = await supabase
        .from('watch_later')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!videoId,
  });

  return isInWatchLater ?? false;
};

export const useToggleWatchLater = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, isInList }: { videoId: string; isInList: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isInList) {
        const { error } = await supabase
          .from('watch_later')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('watch_later')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { isInList }) => {
      queryClient.invalidateQueries({ queryKey: ['watch-later'] });
      queryClient.invalidateQueries({ queryKey: ['is-watch-later'] });
      toast.success(isInList ? 'Removed from Watch Later' : 'Added to Watch Later');
    },
  });
};

export const useClearWatchLater = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from('watch_later')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-later'] });
      toast.success('Watch Later cleared');
    },
  });
};
