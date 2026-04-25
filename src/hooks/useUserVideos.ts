import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?.*)?$/i;

const isVideoUrl = (url?: string | null) => !!url && VIDEO_EXT_REGEX.test(url);

export const useUserVideos = (userId?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['user-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Get videos from user's Motion channel (if any)
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let channelVideos: any[] = [];
      if (channel) {
        const { data } = await supabase
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
        channelVideos = (data || []).map((v) => ({
          ...v,
          source: 'channel' as const,
        }));
      }

      // 2. Get user's posts that contain a video (image_url or media_urls with video extension)
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, image_url, media_urls, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const postVideos = (posts || [])
        .map((p: any) => {
          const mediaArr: string[] = Array.isArray(p.media_urls) ? p.media_urls : [];
          const videoFromMedia = mediaArr.find((u) => isVideoUrl(u));
          const url = isVideoUrl(p.image_url) ? p.image_url : videoFromMedia;
          if (!url) return null;
          return {
            id: p.id,
            title: p.content || 'Video',
            description: p.content,
            thumbnail_url: null,
            video_url: url,
            views_count: 0,
            likes_count: 0,
            duration: null,
            created_at: p.created_at,
            channels: null,
            source: 'post' as const,
          };
        })
        .filter(Boolean) as any[];

      // 3. Merge and sort by created_at desc
      const merged = [...channelVideos, ...postVideos].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return merged;
    },
    enabled: !!userId,
  });

  return { videos, isLoading };
};
