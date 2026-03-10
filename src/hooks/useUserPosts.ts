import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const POSTS_PER_PAGE = 10;

export const useUserPosts = (userId?: string, page: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: posts, isLoading } = useQuery({
    queryKey: ['user-posts', userId, page],
    queryFn: async () => {
      if (!userId) return { posts: [], hasMore: false };

      // Check if viewing own profile
      const isOwnProfile = user?.id === userId;
      
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

      // If not viewing own profile, filter by visibility
      if (!isOwnProfile && user?.id) {
        // Get friendship status
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId})`)
          .eq('status', 'accepted')
          .limit(1);
        
        const isFriend = friendship && friendship.length > 0;
        
        if (isFriend) {
          // Friends can see public and friends-only posts
          query = query.or('visibility.eq.public,visibility.eq.friends');
        } else {
          // Non-friends can only see public posts
          query = query.eq('visibility', 'public');
        }
      }
      // Own profile: show all posts (no visibility filter needed)

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      const hasMore = data ? data.length === POSTS_PER_PAGE : false;
      
      return { posts: data || [], hasMore };
    },
    enabled: !!userId,
  });

  // Realtime subscription for friendship changes affecting post visibility
  useEffect(() => {
    if (!userId || !user || user.id === userId) return;

    const channel = supabase
      .channel(`user-posts-${userId}-changes`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'friendships',
        filter: `or(and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId}))`
      }, (payload) => {
        if (payload.new.status === 'accepted') {
          queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'friendships',
        filter: `or(and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId}))`
      }, (payload) => {
        if (payload.new.status === 'accepted' || payload.old.status === 'accepted') {
          queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'friendships',
        filter: `or(and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId}))`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user, queryClient]);

  return { posts: posts?.posts || [], hasMore: posts?.hasMore || false, isLoading };
};
