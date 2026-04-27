/**
 * useUserPosts — cursor-based infinite scroll for a single user's posts.
 *
 * Switched from offset pagination (.range) to cursor pagination
 * (.lt('created_at', cursor)) so that:
 *   - new posts arriving mid-scroll never cause duplicates
 *   - removing the manual Prev/Next UI on the Profile module is safe
 *
 * Backwards-compatible return shape: `posts` (flat array) + `hasMore` are
 * preserved; `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` are added
 * for the new infinite-scroll consumer in Profile.tsx.
 *
 * The 2nd `page` arg is intentionally accepted but ignored — kept so any
 * older caller still type-checks during the rollout.
 */
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const POSTS_PER_PAGE = 10;
const FUTURE_CURSOR = '9999-12-31T23:59:59.999Z';

export const useUserPosts = (userId?: string, _legacyPage: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<{ posts: any[]; nextCursor: string | null }>({
    queryKey: ['user-posts', userId],
    initialPageParam: FUTURE_CURSOR as string,
    enabled: !!userId,
    queryFn: async ({ pageParam }) => {
      if (!userId) return { posts: [], nextCursor: null };
      const cursor = (pageParam as string) || FUTURE_CURSOR;

      const isOwnProfile = user?.id === userId;

      let q = supabase
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
        .lt('created_at', cursor)
        .limit(POSTS_PER_PAGE);

      // Visibility filter — preserved exactly from previous behaviour
      if (!isOwnProfile && user?.id) {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId})`)
          .eq('status', 'accepted')
          .limit(1);

        const isFriend = friendship && friendship.length > 0;
        if (isFriend) {
          q = q.or('visibility.eq.public,visibility.eq.friends');
        } else {
          q = q.eq('visibility', 'public');
        }
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];
      const oldest = rows[rows.length - 1];
      const nextCursor =
        rows.length === POSTS_PER_PAGE && oldest ? (oldest as any).created_at : null;

      return { posts: rows, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Flatten + dedupe across pages (safety net; cursor pagination already
  // prevents duplicates, but a refetch race can still produce overlap).
  const posts = (() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const page of query.data?.pages || []) {
      for (const p of page.posts) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  })();

  // Realtime subscription — preserved exactly: friendship changes (visibility)
  // for other profiles + post INSERT/UPDATE/DELETE for the viewed user.
  useEffect(() => {
    if (!userId || !user) return;

    const isOwnProfile = user.id === userId;
    // Unique channel suffix to avoid Supabase realtime "subscribe error"
    // when multiple instances mount in parallel (e.g. tab swap mid-render).
    const suffix = Math.random().toString(36).slice(2, 8);
    const channelName = isOwnProfile
      ? `own-posts-${userId}-${suffix}`
      : `user-posts-${userId}-${suffix}`;
    const channel = supabase.channel(channelName);

    if (!isOwnProfile) {
      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `or(and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId}))`
        }, (payload: any) => {
          if (payload.new?.status === 'accepted') {
            queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
          filter: `or(and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId}))`
        }, (payload: any) => {
          if (payload.new?.status === 'accepted' || payload.old?.status === 'accepted') {
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
        });
    }

    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user, queryClient]);

  return {
    posts,
    // Legacy API (still consumed by older code paths)
    hasMore: !!query.hasNextPage,
    isLoading: query.isLoading,
    // New infinite-scroll API
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
