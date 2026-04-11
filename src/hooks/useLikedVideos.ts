import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useLikedVideos = () => {
  const { user } = useAuth();

  const { data: likedVideos, isLoading } = useQuery({
    queryKey: ['liked-videos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('likes')
        .select(`
          id,
          created_at,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            video_url,
            views_count,
            duration,
            is_short,
            category,
            channel_id,
            created_at,
            channels:channel_id (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .not('video_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data?.filter(item => item.videos) || [];
    },
    enabled: !!user,
  });

  return { likedVideos, isLoading };
};
