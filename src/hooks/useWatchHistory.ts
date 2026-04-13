import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useWatchHistory = () => {
  const { user } = useAuth();

  const { data: watchHistory, isLoading } = useQuery({
    queryKey: ['watch-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('watch_history')
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
        .order('watched_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { watchHistory, isLoading };
};

export const useAddToHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, watchDuration, watchPercentage }: { 
      videoId: string; 
      watchDuration?: number;
      watchPercentage?: number;
    }) => {
      if (!user) return;

      // Check if already in history
      const { data: existing } = await supabase
        .from('watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('watch_history')
          .update({ 
            watched_at: new Date().toISOString(),
            watch_duration_seconds: watchDuration,
            watch_percentage: watchPercentage
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('watch_history')
          .insert({
            user_id: user.id,
            video_id: videoId,
            watch_duration_seconds: watchDuration,
            watch_percentage: watchPercentage
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });
};

export const useClearHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });
};

export const useRemoveFromHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-history'] });
    },
  });
};

export const useUpdateWatchProgress = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ videoId, currentTime, duration }: { 
      videoId: string; 
      currentTime: number;
      duration: number;
    }) => {
      if (!user || !duration) return;

      const watchPercentage = Math.round((currentTime / duration) * 100);

      const { data: existing } = await supabase
        .from('watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('watch_history')
          .update({ 
            watch_duration_seconds: Math.round(currentTime),
            watch_percentage: watchPercentage
          })
          .eq('id', existing.id);
      }
    },
  });
};
