import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const isVideoUrl = (url?: string | null) =>
  !!url && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

/**
 * Returns the user's videos from BOTH sources:
 * 1. Videos uploaded via their channel (videos table — Movion module)
 * 2. Videos posted via the unified post composer (posts table — feed/profile)
 *
 * Posts that contain a video (in image_url or any media_urls entry) are
 * normalized into the same shape as channel videos so the Profile "Videos"
 * tab can render both seamlessly.
 */
export const useUserVideos = (userId?: string) => {
  const { data: videos, isLoading } = useQuery({
    queryKey: ['user-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1. Channel videos (Movion uploads)
      let channelVideos: any[] = [];
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (channel) {
        const { data: cv, error: cvErr } = await supabase
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
        if (cvErr) throw cvErr;
        channelVideos = (cv || []).map((v) => ({ ...v, source: 'channel' as const }));
      }

      // 2. Posts with video media
      const { data: postRows, error: postErr } = await supabase
        .from('posts')
        .select('id, content, image_url, media_urls, created_at, type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (postErr) throw postErr;

      const postVideos = (postRows || [])
        .map((p: any) => {
          const candidates: string[] = [
            ...(p.image_url ? [p.image_url] : []),
            ...((Array.isArray(p.media_urls) ? p.media_urls : []) as string[]),
          ];
          const videoUrl = candidates.find(isVideoUrl);
          if (!videoUrl && p.type !== 'video') return null;
          return {
            id: p.id,
            title: (p.content || 'Video post').slice(0, 80),
            description: p.content || null,
            thumbnail_url: null,
            video_url: videoUrl || p.image_url || null,
            views_count: 0,
            likes_count: 0,
            duration: null,
            created_at: p.created_at,
            channels: null,
            source: 'post' as const,
          };
        })
        .filter(Boolean) as any[];

      // Merge and sort by created_at desc
      const all = [...channelVideos, ...postVideos].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return all;
    },
    enabled: !!userId,
  });

  return { videos, isLoading };
};
