import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type FeedItemType = 'post' | 'group_post' | 'video' | 'book' | 'page_post';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  content?: string;
  title?: string;
  description?: string;
  image_url?: string;
  media_urls?: string[];
  thumbnail_url?: string;
  video_url?: string;
  cover_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  views_count?: number;
  created_at: string;
  user_id: string;
  group_id?: string;
  channel_id?: string;
  page_id?: string;
  visibility?: string;
  pinned?: boolean;
  poll_data?: any;
  feeling?: string;
  author?: string;
  metadata?: any;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
  group?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  channel?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  page?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

const ITEMS_PER_PAGE = 20;
// Sentinel "infinity" cursor used for the first page so every source query
// has a uniform `.lt('created_at', cursor)` shape. Far enough in the future
// to safely include any real created_at value.
const FUTURE_CURSOR = '9999-12-31T23:59:59.999Z';

export const useFeed = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<{ items: FeedItem[]; nextCursor: string | null }>({
    queryKey: ['unified-feed', user?.id],
    queryFn: async ({ pageParam }) => {
      if (!user) return { items: [], nextCursor: null };
      // Cursor-based pagination (Facebook-style): each page fetches items
      // strictly OLDER than the previous page's oldest item. Eliminates
      // duplicates when new posts are inserted while the user scrolls.
      const cursor = (pageParam as string) || FUTURE_CURSOR;

      // 🚀 OPTIMIZATION: Run all metadata queries in parallel
      const [
        { data: friendships },
        { data: groupMemberships },
        { data: createdGroups },
        { data: subscriptions },
        { data: ownChannels },
        { data: pageFollows }
      ] = await Promise.all([
        // Get user's friends
        supabase
          .from('friendships')
          .select('friend_id, user_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        // Get user's joined groups
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id),
        // Get groups created by user
        supabase
          .from('groups')
          .select('id')
          .eq('creator_id', user.id),
        // Get user's subscribed channels
        supabase
          .from('subscriptions')
          .select('channel_id')
          .eq('user_id', user.id),
        // Get user's own channels
        supabase
          .from('channels')
          .select('id')
          .eq('user_id', user.id),
        // Get pages user follows
        supabase
          .from('page_followers')
          .select('page_id')
          .eq('user_id', user.id)
      ]);

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      const joinedGroupIds = groupMemberships?.map(g => g.group_id) || [];
      const createdGroupIds = createdGroups?.map(g => g.id) || [];
      const allGroupIds = [...new Set([...joinedGroupIds, ...createdGroupIds])];

      const subscribedChannelIds = subscriptions?.map(s => s.channel_id) || [];
      const ownChannelIds = ownChannels?.map(c => c.id) || [];
      const allRelevantChannelIds = [...new Set([...subscribedChannelIds, ...ownChannelIds])];

      const followedPageIds = pageFollows?.map(p => p.page_id) || [];

      // Build visibility filter for posts:
      // - Public posts: visible to everyone
      // - Friends posts: visible only to friends and post owner
      // - Private posts: visible only to post owner
      const buildVisibilityFilter = () => {
        // Show all public posts from friends and self
        // Show friends-only posts from friends and self
        // Show private posts only from self
        if (friendIds.length > 0) {
          // User has friends: show public from friends+self, friends-only from friends+self, private only from self
          return `and(visibility.eq.public,or(user_id.eq.${user.id},user_id.in.(${friendIds.join(',')}))),and(visibility.eq.friends,or(user_id.eq.${user.id},user_id.in.(${friendIds.join(',')}))),and(visibility.eq.private,user_id.eq.${user.id})`;
        } else {
          // No friends: show only own posts (all visibilities)
          return `user_id.eq.${user.id}`;
        }
      };

      // Fetch all content types in parallel with pagination
      const [postsResult, groupPostsResult, videosResult, booksResult, pagePostsResult] = await Promise.all([
        // 1. Regular posts with visibility filtering
        supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .or(buildVisibilityFilter())
          .order('created_at', { ascending: false })
          .lt('created_at', cursor)
          .limit(ITEMS_PER_PAGE),

        // 2. Group posts from joined/created groups
        allGroupIds.length > 0 ? supabase
          .from('group_posts')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            ),
            groups:group_id (
              id,
              name,
              avatar_url
            )
          `)
          .in('group_id', allGroupIds)
          .order('created_at', { ascending: false })
          .lt('created_at', cursor)
          .limit(ITEMS_PER_PAGE) : { data: [], error: null },

        // 3. Videos from subscribed channels, own channels, and friends' channels
        supabase
          .from('videos')
          .select(`
            *,
            channels:channel_id (
              id,
              name,
              avatar_url,
              user_id,
              profiles:user_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            )
          `)
          .order('created_at', { ascending: false })
          .lt('created_at', cursor)
          .limit(ITEMS_PER_PAGE),

        // 4. Books from bookshelf
        supabase
          .from('books')
          .select(`
            *,
            channels:channel_id (
              id,
              name,
              avatar_url,
              user_id,
              profiles:user_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            )
          `)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .lt('created_at', cursor)
          .limit(ITEMS_PER_PAGE),

        // 5. Page posts from followed pages
        followedPageIds.length > 0 ? supabase
          .from('page_posts')
          .select(`
            *,
            pages:page_id (
              id,
              name,
              avatar_url
            ),
            profiles:posted_by (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .in('page_id', followedPageIds)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .lt('created_at', cursor)
          .limit(ITEMS_PER_PAGE) : { data: [], error: null }
      ]);

      const allItems: FeedItem[] = [];

      // Process regular posts (visibility already filtered at DB level)
      if (postsResult.data) {
        postsResult.data.forEach(post => {
          allItems.push({
            id: post.id,
            type: 'post',
            content: post.content,
            image_url: post.image_url,
            media_urls: post.media_urls,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            created_at: post.created_at,
            user_id: post.user_id,
            visibility: post.visibility,
            pinned: post.pinned,
            poll_data: post.poll_data,
            metadata: post.metadata,
            profiles: post.profiles as any
          });
        });
      }

      // Process group posts
      if (groupPostsResult.data) {
        groupPostsResult.data.forEach(post => {
          allItems.push({
            id: post.id,
            type: 'group_post',
            content: post.content,
            image_url: post.image_url,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            created_at: post.created_at,
            user_id: post.user_id,
            group_id: post.group_id,
            pinned: post.pinned,
            profiles: post.profiles as any,
            group: post.groups as any
          });
        });
      }

      // Process videos - include from subscribed channels, own channels, and friends' channels
      if (videosResult.data) {
        videosResult.data.forEach(video => {
          const channel = video.channels as any;
          if (!channel) return;

          // Include if: subscribed channel, own channel, or friend's channel
          const isRelevant = 
            allRelevantChannelIds.includes(video.channel_id) || 
            friendIds.includes(channel.user_id) ||
            channel.user_id === user.id;

          if (!isRelevant) return;

          allItems.push({
            id: video.id,
            type: 'video',
            title: video.title,
            description: video.description,
            thumbnail_url: video.thumbnail_url,
            video_url: video.video_url,
            likes_count: video.likes_count || 0,
            comments_count: video.comments_count || 0,
            views_count: video.views_count || 0,
            created_at: video.created_at,
            user_id: channel.user_id,
            channel_id: video.channel_id,
            profiles: channel.profiles as any,
            channel: {
              id: channel.id,
              name: channel.name,
              avatar_url: channel.avatar_url
            }
          });
        });
      }

      // Process books - include all public books
      if (booksResult.data) {
        booksResult.data.forEach(book => {
          const channel = book.channels as any;
          if (!channel) return;

          allItems.push({
            id: book.id,
            type: 'book',
            title: book.title,
            description: book.description,
            cover_url: book.cover_url,
            author: book.author,
            likes_count: book.likes_count || 0,
            comments_count: book.comments_count || 0,
            views_count: book.views_count || 0,
            created_at: book.created_at,
            user_id: channel.user_id,
            channel_id: book.channel_id,
            profiles: channel.profiles as any,
            channel: {
              id: channel.id,
              name: channel.name,
              avatar_url: channel.avatar_url
            }
          });
        });
      }

      // Process page posts
      if (pagePostsResult.data) {
        pagePostsResult.data.forEach(post => {
          allItems.push({
            id: post.id,
            type: 'page_post',
            content: post.content,
            image_url: post.image_url,
            media_urls: post.media_urls,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            created_at: post.created_at,
            user_id: post.posted_by,
            page_id: post.page_id,
            profiles: post.profiles as any,
            page: post.pages as any
          });
        });
      }

      // Sort strictly by created_at (most recent first)
      const sortedItems = allItems.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Take the page of merged items
      const paginatedItems = sortedItems.slice(0, ITEMS_PER_PAGE);

      // Cursor = oldest item's created_at on this page. Next fetch uses
      // `.lt('created_at', cursor)` so we never re-emit duplicates even if
      // new posts arrive at the top while the user is scrolling.
      const oldest = paginatedItems[paginatedItems.length - 1];
      const nextCursor =
        paginatedItems.length === ITEMS_PER_PAGE && oldest ? oldest.created_at : null;

      return { items: paginatedItems, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: FUTURE_CURSOR as string,
    enabled: !!user,
  });

  // Flatten all pages into single array
  const feedItems = data?.pages.flatMap(page => page.items) || [];

  // 🚀 OPTIMIZATION: Debounced realtime invalidation to prevent storm
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 3000; // Wait 3 seconds, then reload once

    const debouncedInvalidate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('unified-feed-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_posts' }, () => {
        debouncedInvalidate();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, (payload) => {
        if (payload.new.status === 'accepted') {
          debouncedInvalidate();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, (payload) => {
        if (payload.new.status === 'accepted' || payload.old.status === 'accepted') {
          debouncedInvalidate();
        }
      })
      .subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl, mediaUrls, visibility = 'public', pollData, feeling }: { 
      content: string; 
      imageUrl?: string;
      mediaUrls?: string[];
      visibility?: 'public' | 'friends' | 'private';
      pollData?: any;
      feeling?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({ 
          content, 
          user_id: user.id, 
          image_url: imageUrl,
          media_urls: mediaUrls,
          visibility,
          poll_data: pollData,
          metadata: feeling ? { feeling } : {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
      toast({
        title: 'Post created!',
        description: 'Your post has been published',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { 
    feedItems, 
    isLoading, 
    createPost,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
};
