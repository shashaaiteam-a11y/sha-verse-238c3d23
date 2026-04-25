import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PHOTOS_PER_PAGE = 12;

const isVideoUrl = (url?: string | null) =>
  !!url && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

/**
 * Returns the user's posted photos. We pull from posts that have an image_url
 * OR any media_urls entry, then filter out video URLs so videos only show in
 * the Videos tab.
 */
export const useUserPhotos = (userId?: string, page: number = 0) => {
  const { data: result, isLoading } = useQuery({
    queryKey: ['user-photos', userId, page],
    queryFn: async () => {
      if (!userId) return { photos: [], hasMore: false };

      // Over-fetch a bit so filtering out videos still yields a full page.
      const fetchSize = PHOTOS_PER_PAGE * 3;
      const offset = page * PHOTOS_PER_PAGE;

      const { data, error } = await supabase
        .from('posts')
        .select('id, image_url, media_urls, created_at, content, type')
        .eq('user_id', userId)
        .neq('type', 'video')
        .or('image_url.not.is.null,media_urls.neq.{}')
        .order('created_at', { ascending: false })
        .range(offset, offset + fetchSize - 1);

      if (error) throw error;

      // Pick the first non-video media url per post for the photo grid.
      const photos = (data || [])
        .map((p: any) => {
          const candidates: string[] = [
            ...(p.image_url ? [p.image_url] : []),
            ...((Array.isArray(p.media_urls) ? p.media_urls : []) as string[]),
          ];
          const photoUrl = candidates.find((u) => u && !isVideoUrl(u));
          if (!photoUrl) return null;
          return {
            id: p.id,
            image_url: photoUrl,
            created_at: p.created_at,
            content: p.content,
          };
        })
        .filter(Boolean)
        .slice(0, PHOTOS_PER_PAGE);

      const hasMore = (data?.length || 0) >= fetchSize;

      return { photos, hasMore };
    },
    enabled: !!userId,
  });

  return {
    photos: result?.photos || [],
    hasMore: result?.hasMore || false,
    isLoading,
  };
};
