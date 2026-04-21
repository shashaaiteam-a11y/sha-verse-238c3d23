import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type ShareTarget = 
  | { type: 'timeline' }
  | { type: 'group'; groupId: string; groupName: string }
  | { type: 'page'; pageId: string; pageName: string };

export const useShares = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Share post to timeline
  const sharePost = useMutation({
    mutationFn: async ({ postId, comment }: { postId: string; comment?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shares')
        .insert({ 
          post_id: postId, 
          user_id: user.id,
          comment 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, __, context) => {
      // 🚀 Broad invalidation - would need postId passed to hook for targeted invalidation
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      toast({
        title: 'Shared!',
        description: 'Post has been shared to your timeline',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Could not share post',
        variant: 'destructive',
      });
    },
  });

  // Share group post
  const shareGroupPost = useMutation({
    mutationFn: async ({ groupPostId, comment }: { groupPostId: string; comment?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shares')
        .insert({ 
          group_post_id: groupPostId, 
          user_id: user.id,
          comment 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      toast({
        title: 'Shared!',
        description: 'Post has been shared',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Could not share post',
        variant: 'destructive',
      });
    },
  });

  // Share to a group (creates group post with reference)
  const shareToGroup = useMutation({
    mutationFn: async ({ 
      groupId, 
      originalPostId, 
      originalPostType,
      comment 
    }: { 
      groupId: string; 
      originalPostId: string;
      originalPostType: 'post' | 'group_post' | 'video' | 'book';
      comment?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create a group post with reference to original
      const sharedContent = `[Shared ${originalPostType}]${comment ? `\n\n${comment}` : ''}`;
      
      const { data, error } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: sharedContent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      toast({
        title: 'Shared to group!',
        description: 'Post has been shared to the group',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Could not share to group',
        variant: 'destructive',
      });
    },
  });

  // Share to a page (creates page post with reference)
  const shareToPage = useMutation({
    mutationFn: async ({ 
      pageId, 
      originalPostId,
      originalPostType,
      comment 
    }: { 
      pageId: string; 
      originalPostId: string;
      originalPostType: 'post' | 'group_post' | 'video' | 'book';
      comment?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const sharedContent = `[Shared ${originalPostType}]${comment ? `\n\n${comment}` : ''}`;
      
      const { data, error } = await supabase
        .from('page_posts')
        .insert({
          page_id: pageId,
          posted_by: user.id,
          content: sharedContent,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-posts'] });
      toast({
        title: 'Shared to page!',
        description: 'Post has been shared to the page',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Could not share to page',
        variant: 'destructive',
      });
    },
  });

  // Check if content can be shared based on privacy
  const checkSharePermission = async (
    postId: string, 
    postType: 'post' | 'group_post' | 'video' | 'book' | 'channel'
  ): Promise<{ canShare: boolean; visibility: string; reason?: string }> => {
    if (!user) return { canShare: false, visibility: 'unknown', reason: 'Not authenticated' };

    if (postType === 'post') {
      const { data } = await supabase
        .from('posts')
        .select('visibility, user_id')
        .eq('id', postId)
        .single();

      if (!data) return { canShare: false, visibility: 'unknown', reason: 'Post not found' };

      if (data.visibility === 'private') {
        return { canShare: false, visibility: 'private', reason: 'Private posts cannot be shared' };
      }

      if (data.visibility === 'friends' && data.user_id !== user.id) {
        // Check if friends
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${data.user_id}),and(user_id.eq.${data.user_id},friend_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!friendship) {
          return { canShare: false, visibility: 'friends', reason: 'Only friends can share this post' };
        }
      }

      return { canShare: true, visibility: data.visibility || 'public' };
    }

    // Group posts, videos, books, channels are shareable by default
    return { canShare: true, visibility: 'public' };
  };

  return { 
    sharePost, 
    shareGroupPost, 
    shareToGroup,
    shareToPage,
    checkSharePermission
  };
};
