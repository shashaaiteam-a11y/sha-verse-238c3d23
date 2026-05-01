import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

export interface ReaderBookmark {
  id: string;
  user_id: string;
  book_id: string;
  location: { page?: number; cfi?: string };
  label: string | null;
  color: string;
  created_at: string;
}

export const useReaderBookmarks = (bookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["reader-bookmarks", bookId, user?.id],
    queryFn: async () => {
      if (!user?.id || !bookId) return [];
      const { data, error } = await supabase
        .from("reader_bookmarks" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReaderBookmark[];
    },
    enabled: !!bookId && !!user?.id,
  });

  const addBookmark = useMutation({
    mutationFn: async ({ location, label }: { location: { page?: number; cfi?: string }; label?: string }) => {
      if (!user?.id || !bookId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("reader_bookmarks" as any)
        .insert({
          user_id: user.id,
          book_id: bookId,
          location,
          label: label || `Page ${location.page || '?'}`,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success("Bookmark added!");
    },
    onError: () => toast.error("Failed to add bookmark"),
  });

  const removeBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reader_bookmarks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reader-bookmarks", bookId] });
      toast.success("Bookmark removed");
    },
    onError: () => toast.error("Failed to remove bookmark"),
  });

  const isPageBookmarked = (page: number) => {
    return bookmarks.some((b) => b.location?.page === page);
  };

  const getBookmarkForPage = (page: number) => {
    return bookmarks.find((b) => b.location?.page === page);
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isPageBookmarked,
    getBookmarkForPage,
  };
};
