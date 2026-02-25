import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BookComment {
  id: string;
  book_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
  replies?: BookComment[];
  reply_count?: number;
}

export const useBookComments = (bookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch comments for a book
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["book-comments", bookId],
    queryFn: async () => {
      if (!bookId) return [];

      const { data, error } = await (supabase as any)
        .from("book_comments")
        .select(`
          *,
          profile:profiles(display_name, avatar_url),
          replies:book_comments!parent_id(*, profile:profiles(display_name, avatar_url))
        `)
        .eq("book_id", bookId)
        .is("parent_id", null) // Only top-level comments
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Count replies for each comment
      return (data as any[]).map(comment => ({
        ...comment,
        reply_count: comment.replies?.length || 0
      })) as BookComment[];
    },
    enabled: !!bookId,
  });

  // Create comment
  const createComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("book_comments")
        .insert({
          book_id: bookId,
          user_id: user.id,
          content,
          parent_id: parentId || null,
        })
        .select(`
          *,
          profile:profiles(display_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as BookComment;
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({ queryKey: ["book-comments", bookId] });

      // ✅ Use atomic increment function to update comment count
      if (bookId && !(newComment as any).parent_id) {
        (supabase.rpc as any)('increment_book_comment_count', { book_id: bookId });
      }

      toast.success("Comment added successfully!");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  // Update comment
  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("book_comments")
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("user_id", user.id)
        .select(`
          *,
          profile:profiles(display_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as BookComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-comments", bookId] });
      toast.success("Comment updated!");
    },
    onError: () => {
      toast.error("Failed to update comment");
    },
  });

  // Delete comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("book_comments")
        .delete()
        .eq("id", commentId)
        .or(`user_id.eq.${user.id},profile.user_id.eq.${user.id}`); // User or channel owner can delete

      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["book-comments", bookId] });

      // Update book's comment count
      if (bookId) {
        (supabase.rpc as any)('decrement_book_comment_count', { book_id: bookId });
      }

      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });

  // Like comment
  const likeComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if already liked
      const { data: existingLike } = await (supabase as any)
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .single();

      if (existingLike) {
        // Unlike
        await (supabase as any)
          .from("comment_likes")
          .delete()
          .eq("id", existingLike.id);

        // Create atoms for better efficiency if possible, for now just update
        const { data: newLikes } = await (supabase as any).rpc('comment_likes_count', { comment_id: commentId });
        await (supabase as any)
          .from("book_comments")
          .update({
            likes_count: newLikes || 0
          })
          .eq("id", commentId);
      } else {
        // Like
        await (supabase as any)
          .from("comment_likes")
          .insert({
            comment_id: commentId,
            user_id: user.id
          });

        // Increment like count
        const { data: newLikes } = await (supabase as any).rpc('comment_likes_count', { comment_id: commentId });
        await (supabase as any)
          .from("book_comments")
          .update({
            likes_count: newLikes || 0
          })
          .eq("id", commentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-comments", bookId] });
    },
  });

  // Check if user liked a comment
  const useCommentLikeStatus = (commentId: string) => {
    return useQuery({
      queryKey: ["comment-liked", commentId, user?.id],
      queryFn: async () => {
        if (!user?.id || !commentId) return false;

        const { data } = await (supabase as any)
          .from("comment_likes")
          .select("id")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .single();

        return !!data;
      },
      enabled: !!commentId && !!user?.id,
    });
  };

  // Real-time subscription for comments
  useEffect(() => {
    if (!bookId) return;

    const channel = supabase
      .channel(`book-comments-${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_comments',
          filter: `book_id=eq.${bookId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['book-comments', bookId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, queryClient]);

  return {
    comments,
    isLoading,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    useCommentLikeStatus,
  };
};