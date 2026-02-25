import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Book } from "@/hooks/useBooks";
import { useEffect } from "react";

export const useBookFeed = (options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    channelId?: string;
} = {}) => {
    const {
        page = 0,
        limit = 20,
        search = "",
        category = "All",
        channelId,
    } = options;

    return useQuery({
        queryKey: ["books", "feed", { page, limit, search, category, channelId }],
        queryFn: async () => {
            let query = supabase
                .from("books")
                .select(`
          *,
          channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
        `)
                .order("created_at", { ascending: false });

            if (channelId) {
                query = query.eq("channel_id", channelId);
            }

            if (search) {
                query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
            }

            if (category && category !== "All") {
                query = query.eq("category", category);
            }

            // Pagination
            query = query.range(page * limit, (page + 1) * limit - 1);

            const { data, error } = await query;
            if (error) throw error;
            return data as Book[];
        },
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 1, // 1 minute stale time
    });
};

export const useTrendingBooks = (category: string = "All") => {
    return useQuery({
        queryKey: ["books", "trending", category],
        queryFn: async () => {
            let query = supabase
                .from("books")
                .select(`
          *,
          channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
        `)
                .order("views_count", { ascending: false })
                .limit(20);

            if (category && category !== "All") {
                query = query.eq("category", category);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Book[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useSubscribedBooks = (options: { search?: string; category?: string; page?: number; limit?: number } = {}) => {
    const { user } = useAuth();
    const { search = "", category = "All", page = 0, limit = 20 } = options;
    const queryClient = useQueryClient();

    // Real-time listener for subscription changes to update the feed
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('feed-subscriptions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["books", "subscribed", user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

    return useQuery({
        queryKey: ["books", "subscribed", user?.id, { search, category, page }],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data: subs } = await (supabase as any)
                .from("subscriptions")
                .select("channel_id")
                .eq("user_id", user.id);

            if (!subs || subs.length === 0) return [];

            const channelIds = subs.map(s => s.channel_id);

            let query = (supabase as any)
                .from("books")
                .select(`*, channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)`)
                .in("channel_id", channelIds)
                .order("created_at", { ascending: false });

            if (search) {
                query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
            }

            if (category && category !== "All") {
                query = query.eq("category", category);
            }

            query = query.range(page * limit, (page + 1) * limit - 1);

            const { data: books, error } = await query;

            if (error) throw error;
            return books || [];
        },
        enabled: !!user?.id,
    });
};

export const useSavedBooks = (options: { search?: string; category?: string; page?: number; limit?: number } = {}) => {
    const { user } = useAuth();
    const { search = "", category = "All", page = 0, limit = 20 } = options;

    return useQuery({
        queryKey: ["books", "saved", user?.id, { search, category, page }],
        queryFn: async () => {
            if (!user?.id) return [];

            let query = (supabase as any)
                .from("saved_books")
                .select(`
            id,
            book:books!inner(*, channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id))
          `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            // Note: For deep filtering on 'book' relation, Supabase/Postgrest syntax can be complex.
            // This simple filtering might fail if syntax is improper for joined tables.
            // Ideally we rely on IDs or use RLS. 
            // For now, we will assume basic fetching and client side filtering if the complex query fails,
            // BUT the prompt requested Server Side.
            // Correct PostgREST syntax for nested filter: books.title.ilike

            if (search) {
                query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`, { foreignTable: 'books' });
            }

            if (category && category !== "All") {
                query = query.eq('books.category', category);
            }

            query = query.range(page * limit, (page + 1) * limit - 1);

            const { data, error } = await query;

            if (error) throw error;
            return data?.map(d => d.book).filter(Boolean) as Book[] || [];
        },
        enabled: !!user?.id,
    });
};

export const useBook = (bookId?: string) => {
    return useQuery({
        queryKey: ["books", "detail", bookId],
        queryFn: async () => {
            if (!bookId) return null;

            const { data, error } = await supabase
                .from("books")
                .select(`
          *,
          channel:channels!books_channel_id_fkey(id, name, avatar_url, user_id)
        `)
                .eq("id", bookId)
                .single();

            if (error) throw error;
            return data as Book;
        },
        enabled: !!bookId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
