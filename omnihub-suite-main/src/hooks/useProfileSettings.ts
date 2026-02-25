import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useProfileSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch blocked users
  const { data: blockedUsers, isLoading: blockedUsersLoading } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          created_at,
          reason,
          profiles:blocked_id(id, display_name, username, avatar_url)
        `)
        .eq('blocker_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch profile activities (activity log)
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['profile-activities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('profile_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Block user mutation with enhanced functionality
  const blockUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // First, remove any existing friendship
      await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);
      
      // Then block the user
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
          reason,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
      toast({ 
        title: 'User blocked', 
        description: 'User has been blocked and removed from friends list' 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Unblock user mutation with proper handling
  const unblockUser = useMutation({
    mutationFn: async (blockId: string) => {
      // First get the blocked user ID before deleting the block
      const { data: blockData } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('id', blockId)
        .single();
      
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);
      
      if (error) throw error;
      
      // Return the blocked user ID for potential friend request
      return blockData?.blocked_id;
    },
    onSuccess: (blockedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast({ 
        title: 'User unblocked', 
        description: 'User has been unblocked. You can send a new friend request if desired.' 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // End session mutation
  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast({ title: 'Session ended', description: 'Device has been logged out' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // End all other sessions
  const endAllOtherSessions = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_current', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast({ title: 'Sessions ended', description: 'All other devices have been logged out' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Profile updated', description: 'Your changes have been saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update privacy settings
  const updatePrivacy = useMutation({
    mutationFn: async (privacy: Record<string, string>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ privacy })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Privacy updated', description: 'Your privacy settings have been saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Change password
  const changePassword = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Password changed', description: 'Your password has been updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Check if a user is blocked
  const isUserBlocked = (userId: string) => {
    return blockedUsers?.some((block: any) => block.blocked_id === userId) || false;
  };

  return {
    blockedUsers,
    blockedUsersLoading,
    sessions,
    sessionsLoading,
    activities,
    activitiesLoading,
    blockUser,
    unblockUser,
    endSession,
    endAllOtherSessions,
    updateProfile,
    updatePrivacy,
    changePassword,
    isUserBlocked,
  };
};
