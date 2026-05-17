import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useFriendSuggestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate friend suggestions (RPC). Only invoke when needed.
  const calculateSuggestions = async () => {
    if (!user) return;

    try {
      await supabase.rpc('calculate_friend_suggestions', { target_user_id: user.id });
    } catch (error) {
      console.error('Failed to calculate suggestions:', error);
    }
  };

  // Fetch friend suggestions with stale-while-revalidate pattern.
  // Avoids running the heavy RPC on every page load — recalculates only when
  // suggestions are missing or older than the freshness window (6 hours).
  // A nightly cron job keeps suggestions fresh in the background for active users.
  const STALE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

  const { data: suggestions, isLoading, refetch } = useQuery({
    queryKey: ['friend-suggestions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const fetchSuggestions = async () => {
        const { data, error } = await supabase
          .from('friend_suggestions')
          .select(`
            id,
            score,
            reason,
            suggested_user_id,
            created_at,
            profiles:suggested_user_id (
              id,
              display_name,
              username,
              avatar_url,
              bio
            )
          `)
          .eq('user_id', user.id)
          .order('score', { ascending: false })
          .limit(10);

        if (error) throw error;
        return data || [];
      };

      // First fetch existing suggestions (fast path — serve cached data instantly)
      let data = await fetchSuggestions();
      // No stale-recalc forced here; combined query below ensures every non-friend shows.

      // Determine if we need to recalculate:
      // - No suggestions exist yet (new user / never computed), OR
      // - Most recent suggestion is older than the stale window
      const newest = data.reduce<number>((acc, s: any) => {
        const t = s.created_at ? new Date(s.created_at).getTime() : 0;
        return t > acc ? t : acc;
      }, 0);
      const isStale = data.length === 0 || (Date.now() - newest) > STALE_WINDOW_MS;

      if (isStale) {
        await calculateSuggestions();
        data = await fetchSuggestions();
      }

      return data;
    },
    enabled: !!user,
    staleTime: STALE_WINDOW_MS, // React Query cache aligns with backend freshness
  });

  // Fetch ALL non-friend, non-pending users across the entire app so every
  // unfriended person shows up in PYMK (merged with algorithmic suggestions below).
  const { data: fallbackSuggestions } = useQuery({
    queryKey: ['fallback-suggestions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Exclude: self, anyone in any friendship row (accepted/pending/blocked, either direction)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const excludeIds = new Set<string>([user.id]);
      friendships?.forEach(f => {
        excludeIds.add(f.user_id);
        excludeIds.add(f.friend_id);
      });

      const excludeList = Array.from(excludeIds).join(',');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .not('id', 'in', `(${excludeList})`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Send friend request
  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['fallback-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
      toast({ title: 'Friend request sent!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send request', description: error.message, variant: 'destructive' });
    },
  });

  // Merge algorithmic suggestions with full non-friend pool, deduped.
  const algoMapped = (suggestions || []).map(s => {
    const profile = s.profiles as any;
    return profile?.id ? {
      id: profile.id,
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      suggestionId: s.id,
      mutualCount: (s.reason as any)?.mutual_friends || 0,
    } : null;
  }).filter(Boolean) as any[];

  const seen = new Set<string>(algoMapped.map(s => s.id));
  const fallbackMapped = (fallbackSuggestions || [])
    .filter(p => !seen.has(p.id))
    .map(p => ({ ...p, suggestionId: null, mutualCount: 0 }));

  const allSuggestions = [...algoMapped, ...fallbackMapped];

  // Realtime: friend suggestions update when friendships change
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`friend-suggestions-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['friend-suggestions', user.id] });
        queryClient.invalidateQueries({ queryKey: ['fallback-suggestions', user.id] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_suggestions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['friend-suggestions', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    suggestions: allSuggestions,
    isLoading,
    sendRequest,
    refetch,
  };
};
