import { useQuery } from '@tanstack/react-query';
import { useMovionRealtime } from '@/hooks/useMovionRealtime';
import { supabase } from '@/integrations/supabase/client';

// Transform Supabase video data to component-compatible format
const transformVideoData = (video: any) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    ...video,
    thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
    videoUrl: video.video_url || video.hls_url || '',
    duration_seconds: video.duration,
    duration: formatDuration(video.duration),
    channelName: video.channels?.name || 'Unknown Channel',
    channelAvatar: video.channels?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel_id}`,
    views: video.views_count || 0,
    likes: video.likes_count || 0,
    dislikes: video.dislikes_count || 0,
    timestamp: video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently',
  };
};

export const useShorts = () => {
  useMovionRealtime();

  const { data: shorts, isLoading } = useQuery({
    queryKey: ['shorts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count
          )
        `)
        .eq('is_short', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      // Skip seed/demo rows whose media URLs don't exist (they render as "Video unavailable")
      const isPlayable = (v: any) => {
        const url: string = v.video_url || v.hls_url || '';
        if (!url) return false;
        return !url.includes('sample-videos.com');
      };
      return (data || []).filter(isPlayable).map(transformVideoData);
    },
  });

  return { shorts, isLoading };
};

export const useLongVideos = (category?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['long-videos', category],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select(`
          *,
          channels:channel_id (
            id,
            name,
            avatar_url,
            user_id,
            subscribers_count
          )
        `)
        .eq('is_short', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(transformVideoData);
    },
  });

  return { videos, isLoading };
};
