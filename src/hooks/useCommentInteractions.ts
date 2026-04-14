// Comment Like/Dislike/Reply interactions for Movion video comments
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Check if user liked a specific comment
 */
export const useCommentLikeStatus = (commentId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comment-like-status', commentId, user?.id],
    queryFn: async () => {
      if (!user || !commentId) return { liked: false, disliked: false };

      const { data, error } = await supabase
        .from('likes')
        .select('id, reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return {
        liked: data?.reaction_type === 'like',
        disliked: data?.reaction_type === 'dislike',
      };
    },
    enabled: !!user && !!commentId,
  });
};

/**
 * Get like count for a comment
 */
export const useCommentLikeCount = (commentId?: string) => {
  return useQuery({
    queryKey: ['comment-like-count', commentId],
    queryFn: async () => {
      if (!commentId) return 0;
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('reaction_type', 'like');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!commentId,
  });
};

/**
 * Toggle like/dislike on a comment
 */
export const useToggleCommentReaction = (videoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, type }: { commentId: string; type: 'like' | 'dislike' }) => {
      if (!user) throw new Error('Not authenticated');

      // Check existing reaction
      const { data: existing } = await supabase
        .from('likes')
        .select('id, reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === type) {
          // Same reaction — remove it (toggle off)
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          // Different reaction — update it
          const { error } = await supabase
            .from('likes')
            .update({ reaction_type: type })
            .eq('id', existing.id);
          if (error) throw error;
        }
      } else {
        // No existing reaction — insert new
        const { error } = await supabase
          .from('likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: type,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ['comment-like-status', commentId] });
      queryClient.invalidateQueries({ queryKey: ['comment-like-count', commentId] });
    },
  });
};

/**
 * Add a reply to a comment (uses parent_comment_id)
 */
export const useReplyToComment = (videoId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parentCommentId, content }: { parentCommentId: string; content: string }) => {
      if (!user || !videoId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          video_id: videoId,
          parent_comment_id: parentCommentId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      toast.success('Reply added!');
    },
  });
};

/**
 * Get replies for a specific comment
 */
export const useCommentReplies = (parentCommentId?: string) => {
  return useQuery({
    queryKey: ['comment-replies', parentCommentId],
    queryFn: async () => {
      if (!parentCommentId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id, username, display_name, avatar_url
          )
        `)
        .eq('parent_comment_id', parentCommentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!parentCommentId,
  });
};
