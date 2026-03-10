import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const usePosts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's friends for visibility filtering
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];
      
      // Get ALL posts from ALL users (like Facebook's public feed)
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Filter posts based on visibility settings
      const filteredPosts = data?.filter(post => {
        // User's own posts - always visible
        if (post.user_id === user.id) return true;
        
        // Public posts - visible to everyone
        if (post.visibility === 'public' || !post.visibility) return true;
        
        // Friends-only posts - visible if user is a friend
        if (post.visibility === 'friends') {
          return friendIds.includes(post.user_id);
        }
        
        // Private posts - only visible to owner (already handled above)
        return false;
      }) || [];

      // Feed Algorithm: Sort by multiple factors
      // 1. Pinned posts first
      // 2. Friends' posts prioritized  
      // 3. Recent posts (within 24h get boost)
      // 4. Engagement-based (likes + comments)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const scoredPosts = filteredPosts.map(post => {
        let score = 0;
        
        // Pinned posts get highest priority
        if (post.pinned) score += 10000;
        
        // Friends' posts get priority
        if (friendIds.includes(post.user_id)) score += 500;
        
        // Own posts get slight priority
        if (post.user_id === user.id) score += 300;
        
        // Recency boost (posts within 24h)
        const postDate = new Date(post.created_at);
        if (postDate > oneDayAgo) {
          const hoursAgo = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
          score += Math.max(0, 200 - hoursAgo * 8); // Decay over 24 hours
        }
        
        // Engagement score
        const engagement = (post.likes_count || 0) * 2 + (post.comments_count || 0) * 3;
        score += Math.min(engagement, 300); // Cap at 300 to prevent spam
        
        return { ...post, _score: score };
      });

      // Sort by score descending, then by created_at for ties
      return scoredPosts.sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl, visibility = 'public' }: { content: string; imageUrl?: string; visibility?: 'public' | 'friends' | 'private' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({ content, user_id: user.id, image_url: imageUrl, visibility })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
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

  // Keep toggleLike for backward compatibility (now uses reactions)
  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('likes').insert({ 
          post_id: postId, 
          user_id: user.id,
          reaction_type: 'like'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Pin/Unpin post
  const togglePinPost = useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: post } = await supabase
        .from('posts')
        .select('pinned')
        .eq('id', postId)
        .eq('user_id', user.id)
        .single();

      if (!post) throw new Error('Post not found or not authorized');

      await supabase
        .from('posts')
        .update({ pinned: !post.pinned })
        .eq('id', postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Post updated' });
    },
  });

  return { posts, isLoading, createPost, toggleLike, togglePinPost };
};
