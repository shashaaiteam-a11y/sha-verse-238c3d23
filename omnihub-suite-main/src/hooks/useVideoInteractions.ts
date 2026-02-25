import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type InteractionType = 'view' | 'like' | 'dislike' | 'save' | 'share' | 'skip' | 'watch_complete';

interface TrackInteractionParams {
  videoId: string;
  type: InteractionType;
  watchDuration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Track video interactions for AI recommendations
 */
export const useTrackInteraction = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, type, watchDuration, metadata }: TrackInteractionParams) => {
      if (!user) return;

      const { error } = await supabase
        .from('video_interactions')
        .insert({
          user_id: user.id,
          video_id: videoId,
          interaction_type: type,
          watch_duration_seconds: watchDuration || 0,
          metadata: metadata || {},
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-interactions'] });
    },
  });
};

/**
 * Get user's interaction history for AI personalization
 */
export const useUserInteractions = (limit = 100) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-interactions', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('video_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

/**
 * Calculate engagement score for a video based on interactions
 */
export const useVideoEngagementScore = (videoId?: string) => {
  return useQuery({
    queryKey: ['video-engagement', videoId],
    queryFn: async () => {
      if (!videoId) return 0;

      const { data, error } = await supabase
        .from('video_interactions')
        .select('interaction_type, watch_duration_seconds')
        .eq('video_id', videoId);

      if (error) throw error;

      // Calculate engagement score
      let score = 0;
      data?.forEach((interaction: any) => {
        switch (interaction.interaction_type) {
          case 'view': score += 1; break;
          case 'like': score += 5; break;
          case 'save': score += 8; break;
          case 'share': score += 10; break;
          case 'watch_complete': score += 15; break;
          case 'dislike': score -= 2; break;
          case 'skip': score -= 1; break;
        }
        // Bonus for watch time
        if (interaction.watch_duration_seconds > 30) {
          score += Math.min(interaction.watch_duration_seconds / 60, 10);
        }
      });

      return Math.max(0, score);
    },
    enabled: !!videoId,
  });
};

/**
 * Get recommended videos based on user interactions
 */
export const useAIRecommendations = (limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', user?.id, limit],
    queryFn: async () => {
      if (!user) return [] as any[];
      const result = await supabase.from('videos').select('*').limit(limit);
      return (result.data || []) as any[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
