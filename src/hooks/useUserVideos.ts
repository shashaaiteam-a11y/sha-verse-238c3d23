import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserVideos = (userId?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['user-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get user's channel first
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!channel) return [];

      // Get videos from user's channel
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          video_url,
          views_count,
          likes_count,
          duration,
          created_at,
          channels:channel_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return { videos, isLoading };
};
