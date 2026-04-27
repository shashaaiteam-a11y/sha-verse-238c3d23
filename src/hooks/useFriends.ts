import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const FRIENDS_PER_PAGE = 20;

export const useFriends = (page: number = 0) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all friends (accepted) with pagination
  const { data: friendsResult, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', user?.id, page],
    queryFn: async () => {
      if (!user) return { friends: [], hasMore: false };
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          status,
          profiles:friend_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .range(page * FRIENDS_PER_PAGE, (page + 1) * FRIENDS_PER_PAGE - 1);
      
      if (error) throw error;
      const hasMore = data ? data.length === FRIENDS_PER_PAGE : false;
      return { friends: data || [], hasMore };
    },
    enabled: !!user,
  });

  const friends = friendsResult?.friends || [];
  const friendsHasMore = friendsResult?.hasMore || false;

  // Get pending friend requests (received)
  const { data: pendingRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get sent requests
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: ['sent-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          status,
          created_at,
          profiles:friend_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription — listen to BOTH directions of friendship rows.
  // Note: Supabase realtime filters do NOT support OR via comma; we need two listeners.
  useEffect(() => {
    if (!user) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
    };

    const suffix = Math.random().toString(36).slice(2, 8);

    // Channel 1: rows where current user is the sender (user_id)
    const senderChannel = supabase
      .channel(`friendships-sender-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${user.id}` },
        invalidate
      )
      .subscribe();

    // Channel 2: rows where current user is the receiver (friend_id)
    const receiverChannel = supabase
      .channel(`friendships-receiver-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${user.id}` },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(senderChannel);
      supabase.removeChannel(receiverChannel);
    };
  }, [user, queryClient]);

  // Send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
      toast({
        title: 'Friend request sent!',
        description: 'Your request has been sent',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast({
        title: 'Friend request accepted!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Decline friend request
  const declineFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast({
        title: 'Friend request declined',
      });
    },
  });

  // Remove friend
  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: 'Friend removed',
      });
    },
  });

  return {
    friends,
    friendsHasMore,
    friendsLoading,
    pendingRequests,
    requestsLoading,
    sentRequests,
    sentLoading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
  };
};
