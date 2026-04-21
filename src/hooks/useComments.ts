import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

export const useComments = (postId?: string, type: 'post' | 'group_post' | 'video' | 'book' = 'post') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments for a post (including nested replies)
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId, type],
    queryFn: async () => {
      if (!postId) return [];

      const column = type === 'post' ? 'post_id' : type === 'group_post' ? 'group_post_id' : type === 'video' ? 'video_id' : 'book_id';
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_comment_id,
          profiles:user_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq(column, postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Organize into parent comments with replies
      const parentComments = data?.filter(c => !c.parent_comment_id) || [];
      const replies = data?.filter(c => c.parent_comment_id) || [];
      
      // Attach replies to their parent comments
      return parentComments.map(parent => ({
        ...parent,
        replies: replies.filter(r => r.parent_comment_id === parent.id),
      }));
    },
    enabled: !!postId,
  });

  // Create comment (optionally as a reply)
  const createComment = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      if (!user || !postId) throw new Error('Not authenticated or no post');

      const insertData: any = {
        content,
        user_id: user.id,
      };

      if (type === 'post') {
        insertData.post_id = postId;
      } else if (type === 'group_post') {
        insertData.group_post_id = postId;
      } else if (type === 'video') {
        insertData.video_id = postId;
      } else {
        insertData.book_id = postId;
      }

      if (parentCommentId) {
        insertData.parent_comment_id = parentCommentId;
      }

      const { error } = await supabase
        .from('comments')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      // Removed broad ['posts'] and ['group-posts'] invalidation - comments_count auto-synced by DB trigger
    },
    onError: (error: any) => {
      toast({ title: 'Failed to post comment', description: error.message, variant: 'destructive' });
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      // Removed broad ['posts'] invalidation - comments_count auto-synced by DB trigger
      toast({ title: 'Comment deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete comment', description: error.message, variant: 'destructive' });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!postId) return;

    const column = type === 'post' ? 'post_id' : type === 'group_post' ? 'group_post_id' : type === 'video' ? 'video_id' : 'book_id';
    
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `${column}=eq.${postId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['comments', postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, type, queryClient]);

  return {
    comments,
    isLoading,
    createComment,
    deleteComment,
  };
};