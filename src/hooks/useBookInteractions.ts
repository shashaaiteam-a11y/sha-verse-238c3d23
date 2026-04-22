import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BookRating {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export const useBookInteractions = (bookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if book is liked
  const { data: isLiked = false } = useQuery({
    queryKey: ["book-liked", bookId, user?.id],
    queryFn: async () => {
      if (!user?.id || !bookId) return false;
      const { data } = await (supabase as any)
        .from("likes")
        .select("id")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .single();
      return !!data;
    },
    enabled: !!bookId && !!user?.id,
  });

  // Check if book is saved
  const { data: isSaved = false } = useQuery({
    queryKey: ["book-saved", bookId, user?.id],
    queryFn: async () => {
      if (!user?.id || !bookId) return false;
      const { data } = await (supabase as any)
        .from("saved_books")
        .select("id")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .single();
      return !!data;
    },
    enabled: !!bookId && !!user?.id,
  });

  // Get user's rating for this book
  const { data: userRating } = useQuery({
    queryKey: ["book-user-rating", bookId, user?.id],
    queryFn: async () => {
      if (!user?.id || !bookId) return null;
      const { data } = await (supabase as any)
        .from("book_ratings")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!bookId && !!user?.id,
  });

  // Get all ratings for book
  const { data: ratings = [] } = useQuery({
    queryKey: ["book-ratings", bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const { data, error } = await (supabase as any)
        .from("book_ratings")
        .select("*")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BookRating[];
    },
    enabled: !!bookId,
  });

  // Get reading progress
  const { data: readingProgress } = useQuery({
    queryKey: ["book-progress", bookId, user?.id],
    queryFn: async () => {
      if (!user?.id || !bookId) return null;
      const { data, error } = await (supabase as any)
        .from("book_reading_progress")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!bookId && !!user?.id,
  });

  // Toggle like
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");

      if (isLiked) {
        // Unlike
        await (supabase as any)
          .from("likes")
          .delete()
          .eq("book_id", bookId)
          .eq("user_id", user.id);

        // Use atomic decrement function (prevents race conditions)
        await (supabase as any).rpc('decrement_book_likes', { book_id: bookId });
      } else {
        // Like
        await (supabase as any)
          .from("likes")
          .insert({ book_id: bookId, user_id: user.id });

        // Use atomic increment function (prevents race conditions)
        await (supabase as any).rpc('increment_book_likes', { book_id: bookId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-liked", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["books", "trending"] });
      queryClient.invalidateQueries({ queryKey: ["books", "subscribed"] });
      queryClient.invalidateQueries({ queryKey: ["books", "saved"] });
      queryClient.invalidateQueries({ queryKey: ["channelMetrics"] });
    },
  });

  // Toggle save
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");

      if (isSaved) {
        await (supabase as any)
          .from("saved_books")
          .delete()
          .eq("book_id", bookId)
          .eq("user_id", user.id);
        toast.success("Removed from library");
      } else {
        await (supabase as any)
          .from("saved_books")
          .insert({ book_id: bookId, user_id: user.id });
        toast.success("Added to library");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-saved", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books", "saved"] });
      queryClient.invalidateQueries({ queryKey: ["saved-books"] });
    },
  });

  // Submit rating
  const submitRating = useMutation({
    mutationFn: async ({ rating, review }: { rating: number; review?: string }) => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("book_ratings")
        .upsert({
          book_id: bookId,
          user_id: user.id,
          rating,
          review,
          updated_at: new Date().toISOString(),
        }, { onConflict: "book_id,user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-ratings", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book-user-rating", bookId] });
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      toast.success("Rating submitted!");
    },
    onError: () => {
      toast.error("Failed to submit rating");
    },
  });

  // Update reading progress
  const updateProgress = useMutation({
    mutationFn: async ({ currentPage, totalPages }: { currentPage: number; totalPages: number }) => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");
      if (currentPage < 1 || totalPages < 1) return;

      const completed = currentPage >= totalPages;

      await (supabase as any)
        .from("book_reading_progress")
        .upsert({
          book_id: bookId,
          user_id: user.id,
          current_page: currentPage,
          total_pages: totalPages,
          last_read_at: new Date().toISOString(),
          completed,
        }, { onConflict: "book_id,user_id" });
    },
  });

  // Increment download count
  const incrementDownload = useMutation({
    mutationFn: async () => {
      if (!bookId) return;

      // Use atomic increment function (prevents race conditions)
      await (supabase as any).rpc('increment_book_downloads', { book_id: bookId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] });
      queryClient.invalidateQueries({ queryKey: ["channelMetrics"] });
    },
    onError: (error) => {
      console.error("Download increment failed:", error);
      toast.error("Failed to update download count");
    },
  });

  // Increment view count — only once per session per book
  const incrementView = useMutation({
    mutationFn: async () => {
      if (!bookId) return;
      const sessionKey = `book_viewed_${bookId}`;
      if (sessionStorage.getItem(sessionKey)) return; // already counted this session
      await (supabase as any).rpc('increment_book_views', { book_id: bookId });
      sessionStorage.setItem(sessionKey, '1');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] });
    },
  });

  // Submit deletion request
  const submitDeletionRequest = useMutation({
    mutationFn: async ({ reason, description }: { reason: string; description?: string }) => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("book_deletion_requests")
        .insert({
          book_id: bookId,
          user_id: user.id,
          reason,
          description,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deletion request submitted. Admin will review within 24-72 hours.");
    },
    onError: () => {
      toast.error("Failed to submit request");
    },
  });

  // Real-time subscription for book ratings to update ratings and book aggregates instantly
  useEffect(() => {
    if (!bookId) return;

    const channel = supabase
      .channel(`book-ratings-${bookId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'book_ratings', filter: `book_id=eq.${bookId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['book-ratings', bookId] });
          queryClient.invalidateQueries({ queryKey: ['book-user-rating', bookId] });
          queryClient.invalidateQueries({ queryKey: ['book', bookId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, queryClient]);

  return {
    isLiked,
    isSaved,
    userRating,
    ratings,
    readingProgress,
    toggleLike,
    toggleSave,
    submitRating,
    updateProgress,
    incrementDownload,
    incrementView,
    submitDeletionRequest,
  };
};

// Hook to get user's saved books
export const useSavedBooks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-books", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("saved_books")
        .select(`
          *,
          book:books(
            *,
            channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

// Hook to get reading history
export const useReadingHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reading-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("book_reading_progress")
        .select(`
          *,
          book:books(
            *,
            channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
          )
        `)
        .eq("user_id", user.id)
        .order("last_read_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
