import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useFriendSuggestions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate friend suggestions
  const calculateSuggestions = async () => {
    if (!user) return;
    
    try {
      await supabase.rpc('calculate_friend_suggestions', { target_user_id: user.id });
    } catch (error) {
      console.error('Failed to calculate suggestions:', error);
    }
  };

  // Fetch friend suggestions
  const { data: suggestions, isLoading, refetch } = useQuery({
    queryKey: ['friend-suggestions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First try to calculate suggestions
      await calculateSuggestions();

      // Then fetch them
      const { data, error } = await supabase
        .from('friend_suggestions')
        .select(`
          id,
          score,
          reason,
          suggested_user_id,
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
    },
    enabled: !!user,
  });

  // If no suggestions from the algorithm, get random users
  const { data: fallbackSuggestions } = useQuery({
    queryKey: ['fallback-suggestions', user?.id],
    queryFn: async () => {
      if (!user || (suggestions && suggestions.length > 0)) return [];

      // Get existing friends and pending requests
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const excludeIds = new Set([user.id]);
      friendships?.forEach(f => {
        excludeIds.add(f.user_id);
        excludeIds.add(f.friend_id);
      });

      // Get users not in friends list
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, bio')
        .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && (!suggestions || suggestions.length === 0),
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

  const allSuggestions = suggestions && suggestions.length > 0 
    ? suggestions.map(s => {
        const profile = s.profiles as any;
        return { 
          id: profile?.id,
          display_name: profile?.display_name,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          bio: profile?.bio,
          suggestionId: s.id, 
          mutualCount: (s.reason as any)?.mutual_friends || 0 
        };
      })
    : fallbackSuggestions?.map(p => ({ ...p, suggestionId: null, mutualCount: 0 })) || [];

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
