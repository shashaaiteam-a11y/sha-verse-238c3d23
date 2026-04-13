/**
 * useBlockment - Block/Unblock management with privacy checks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RTChatService } from '@/services/RTChatService';
import { toast } from 'sonner';

export const useBlockment = (otherUserId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user blocked the other user
  const { data: isBlocked = false } = useQuery({
    queryKey: ['is-blocked', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return false;
      return RTChatService.block.isBlocked(user.id, otherUserId);
    },
    enabled: !!user?.id && !!otherUserId,
  });

  // Check if current user is blocked BY the other user
  const { data: isBlockedBy = false } = useQuery({
    queryKey: ['is-blocked-by', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return false;
      return RTChatService.block.isBlocked(otherUserId, user.id);
    },
    enabled: !!user?.id && !!otherUserId,
  });

  // Get list of all blocked users
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return RTChatService.block.getBlockedUsers(user.id);
    },
    enabled: !!user?.id,
  });

  // Block user mutation
  const blockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await RTChatService.block.blockUser(user.id, targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      toast.success('User blocked');
    },
    onError: (error) => {
      toast.error('Failed to block user');
      console.error(error);
    }
  });

  // Unblock user mutation
  const unblockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      await RTChatService.block.unblockUser(user.id, targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      toast.success('User unblocked');
    },
    onError: (error) => {
      toast.error('Failed to unblock user');
      console.error(error);
    }
  });

  const handleBlockToggle = async () => {
    if (!otherUserId) return;
    
    if (isBlocked) {
      await unblockUser.mutateAsync(otherUserId);
    } else {
      await blockUser.mutateAsync(otherUserId);
    }
  };

  return {
    isBlocked,
    isBlockedBy,
    blockedUsers,
    blockUser,
    unblockUser,
    handleBlockToggle,
    isLoading: blockUser.isPending || unblockUser.isPending,
  };
};
