import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PHOTOS_PER_PAGE = 12;

export const useUserPhotos = (userId?: string, page: number = 0) => {
  const { data: result, isLoading } = useQuery({
    queryKey: ['user-photos', userId, page],
    queryFn: async () => {
      if (!userId) return { photos: [], hasMore: false };

      // Get all posts with images from this user with pagination
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_url, created_at, content')
        .eq('user_id', userId)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .range(page * PHOTOS_PER_PAGE, (page + 1) * PHOTOS_PER_PAGE - 1);
      
      if (error) throw error;
      
      const hasMore = data ? data.length === PHOTOS_PER_PAGE : false;
      
      return { photos: data || [], hasMore };
    },
    enabled: !!userId,
  });

  return { 
    photos: result?.photos || [], 
    hasMore: result?.hasMore || false,
    isLoading 
  };
};
