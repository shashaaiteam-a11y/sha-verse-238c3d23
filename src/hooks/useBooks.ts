import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useBookFeed, useTrendingBooks } from "./useBookFeeds";
import { generateFileHash, checkBookDuplicate } from "@/modules/bookshelf/lib/fileHash";

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  book_url: string | null;
  pages: number | null;
  channel_id: string;
  category: string | null;
  language: string | null;
  views_count: number;
  likes_count: number;
  downloads_count?: number;
  comments_count: number;
  rating_avg?: number;
  rating_count?: number;
  comments_enabled?: boolean;
  created_at: string;
  channel?: {
    id: string;
    name: string;
    avatar_url: string | null;
    user_id: string;
    subscribers_count?: number;
  };
}

export const useBooks = (options: {
  channelId?: string;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
} = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: books = [], isLoading: isFeedLoading, refetch } = useBookFeed(options);
  const { data: trendingBooks = [], isLoading: isTrendingLoading } = useTrendingBooks(options.category);

  const uploadBook = useMutation({
    mutationFn: async ({
      title,
      subtitle,
      author,
      description,
      coverFile,
      bookFile,
      pages,
      channelId,
      category,
      language,
      tags,
      visibility,
      ageRestriction,
      commentsEnabled,
      ratingsEnabled,
      isbn,
      publisher,
      publicationDate,
    }: {
      title: string;
      subtitle?: string;
      author: string;
      description?: string;
      coverFile?: File;
      bookFile?: File;
      pages?: number;
      channelId: string;
      category?: string;
      language?: string;
      tags?: string[];
      visibility?: string;
      ageRestriction?: string;
      commentsEnabled?: boolean;
      ratingsEnabled?: boolean;
      isbn?: string;
      publisher?: string;
      publicationDate?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      let coverUrl = null;
      let bookUrl = null;

      // Upload cover image to books bucket
      if (coverFile) {
        const coverExt = coverFile.name.split(".").pop();
        const coverName = `${user.id}/covers/${Date.now()}.${coverExt}`;

        const { error: coverError } = await supabase.storage
          .from("books")
          .upload(coverName, coverFile);

        if (coverError) throw coverError;

        const { data: coverData } = supabase.storage
          .from("books")
          .getPublicUrl(coverName);

        coverUrl = coverData.publicUrl;
      }

      // Upload book file to books bucket
      if (bookFile) {
        const bookExt = bookFile.name.split(".").pop();
        const bookName = `${user.id}/files/${Date.now()}.${bookExt}`;

        const { error: bookError } = await supabase.storage
          .from("books")
          .upload(bookName, bookFile);

        if (bookError) throw bookError;

        const { data: bookData } = supabase.storage
          .from("books")
          .getPublicUrl(bookName);

        bookUrl = bookData.publicUrl;
      }

      // Create book record
      const { data, error } = await supabase
        .from("books")
        .insert({
          title,
          subtitle: subtitle || undefined,
          author,
          description,
          cover_url: coverUrl,
          book_url: bookUrl,
          pages,
          channel_id: channelId,
          category,
          language: language || 'English',
          tags: tags || [],
          visibility: visibility || 'public',
          age_restriction: ageRestriction || 'none',
          comments_enabled: commentsEnabled !== false,
          ratings_enabled: ratingsEnabled !== false,
          isbn: isbn || undefined,
          publisher: publisher || undefined,
          publication_date: publicationDate || undefined,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both main feed and channel specific lists
      queryClient.invalidateQueries({ queryKey: ["books", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["books", "subscribed"] });
      toast.success("Book uploaded successfully!");
    },
    onError: (error) => {
      console.error('Book upload failed:', error);

      // Handle specific error types
      if (error.message.includes('storage_limit_exceeded')) {
        toast.error('Storage limit exceeded. Please upgrade your plan or remove some files.');
      } else if (error.message.includes('file_size_limit')) {
        toast.error('File too large. Maximum file size is 100MB.');
      } else if (error.message.includes('invalid_file_format')) {
        toast.error('Invalid file format. Please upload PDF, EPUB, or MOBI files.');
      } else if (error.message.includes('not_authenticated')) {
        toast.error('Please sign in to upload books.');
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }
    },
  });

  const incrementViews = useMutation({
    mutationFn: async (bookId: string) => {
      // Use RPC if available for atomic increment, otherwise standard update
      // For now keeping it simple but checking if we can optimize
      const { data: book } = await supabase
        .from("books")
        .select("views_count")
        .eq("id", bookId)
        .single();

      await supabase
        .from("books")
        .update({ views_count: (book?.views_count || 0) + 1 })
        .eq("id", bookId);
    },
    onSuccess: (data, bookId) => {
      // Only invalidate trending and the specific book, NOT the main feed
      queryClient.invalidateQueries({ queryKey: ["books", "trending"] });
      // We can optionally invalidate the specific book if we are viewing it
      // queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] });
    }
  });

  // Real-time subscription for books table to invalidate lists and keep feeds live
  useEffect(() => {
    const channel = supabase
      .channel(`books-realtime-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'books' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['books', 'feed'] });
          queryClient.invalidateQueries({ queryKey: ['books', 'subscribed'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'books' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['books', 'trending'] });
          queryClient.invalidateQueries({ queryKey: ['books', 'saved'] });
          queryClient.invalidateQueries({ queryKey: ['books', 'feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    books,
    trendingBooks,
    isLoading: isFeedLoading || isTrendingLoading,
    uploadBook,
    incrementViews,
    refetch,
  };
};
