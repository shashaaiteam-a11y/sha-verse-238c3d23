import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useMessagingPermissions = (otherUserId: string) => {
  const { user } = useAuth();

  const { data: canMessage, isLoading } = useQuery({
    queryKey: ['messaging-permission', user?.id, otherUserId],
    queryFn: async () => {
      if (!user || !otherUserId) return false;
      
      try {
        // Check if user has blocked the other user
        const { data: userBlocks } = await supabase
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', otherUserId)
          .single();
        
        // Check if other user has blocked the current user
        const { data: otherUserBlocks } = await supabase
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', otherUserId)
          .eq('blocked_id', user.id)
          .single();
        
        // Check if they are friends (can only message friends)
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .eq('user_id', user.id)
          .eq('friend_id', otherUserId)
          .eq('status', 'accepted')
          .single();
        
        // Can message if:
        // 1. Neither user has blocked the other
        // 2. They are friends
        return !userBlocks && !otherUserBlocks && friendship;
      } catch (error) {
        return false;
      }
    },
    enabled: !!user && !!otherUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    canMessage: canMessage || false,
    isLoading,
  };
};

export const useNotificationPermissions = (recipientId: string) => {
  const { user } = useAuth();

  const { data: canNotify, isLoading } = useQuery({
    queryKey: ['notification-permission', user?.id, recipientId],
    queryFn: async () => {
      if (!user || !recipientId) return false;
      
      try {
        // Check if recipient has blocked the sender
        const { data: recipientBlocks } = await supabase
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', recipientId)
          .eq('blocked_id', user.id)
          .single();
        
        // Check if sender has blocked the recipient
        const { data: senderBlocks } = await supabase
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', user.id)
          .eq('blocked_id', recipientId)
          .single();
        
        // Can notify if neither user has blocked the other
        return !recipientBlocks && !senderBlocks;
      } catch (error) {
        return false;
      }
    },
    enabled: !!user && !!recipientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    canNotify: canNotify || false,
    isLoading,
  };
};