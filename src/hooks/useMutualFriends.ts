import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useMutualFriends = (otherUserId?: string) => {
  const { user } = useAuth();

  const { data: mutualFriends, isLoading } = useQuery({
    queryKey: ['mutual-friends', user?.id, otherUserId],
    queryFn: async () => {
      if (!user || !otherUserId || user.id === otherUserId) return { count: 0, friends: [] };

      // Get current user's friends
      const { data: myFriendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!myFriendships) return { count: 0, friends: [] };

      const myFriendIds = myFriendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get other user's friends
      const { data: theirFriendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${otherUserId},friend_id.eq.${otherUserId}`);

      if (!theirFriendships) return { count: 0, friends: [] };

      const theirFriendIds = theirFriendships.map(f => 
        f.user_id === otherUserId ? f.friend_id : f.user_id
      );

      // Find mutual friends
      const mutualFriendIds = myFriendIds.filter(id => theirFriendIds.includes(id));

      if (mutualFriendIds.length === 0) return { count: 0, friends: [] };

      // Get mutual friend profiles
      const { data: mutualProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', mutualFriendIds)
        .limit(10);

      return {
        count: mutualFriendIds.length,
        friends: mutualProfiles || []
      };
    },
    enabled: !!user && !!otherUserId && user.id !== otherUserId,
  });

  return { 
    mutualFriendsCount: mutualFriends?.count || 0, 
    mutualFriends: mutualFriends?.friends || [],
    isLoading 
  };
};
