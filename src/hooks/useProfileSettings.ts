import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { getCurrentDeviceToken, clearDeviceToken } from '@/lib/sessionTracker';

export const useProfileSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const logActivity = async (content: string, metadata?: Record<string, any>) => {
    if (!user) return;
    await supabase.from('profile_activities').insert({
      user_id: user.id,
      activity_type: 'life_event',
      content,
      metadata: metadata || {},
    });
    queryClient.invalidateQueries({ queryKey: ['profile-activities', user.id] });
  };

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

  // Fetch active sessions (mark this device as current based on local token)
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
      const localToken = getCurrentDeviceToken();
      return (data || []).map((s: any) => ({
        ...s,
        is_current: s.session_token === localToken,
      }));
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
        .limit(200);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscriptions for all settings tabs
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`profile-settings-${user.id}`);

    // Subscribe to user_blocks changes (Blocking tab)
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_blocks',
        filter: `blocker_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['blocked-users', user.id] });
      })
      // Subscribe to user_sessions changes (Security tab)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sessions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-sessions', user.id] });
      })
      // Subscribe to profile_activities changes (Activity Log tab)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profile_activities',
        filter: `user_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['profile-activities', user.id] });
      })
      // Subscribe to profiles changes (Privacy tab - privacy settings)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
      logActivity('Blocked a user', { action: 'block_user' });
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
      if (!user) throw new Error('Not authenticated');
      // First get the blocked user ID before deleting the block
      const { data: blockData, error: fetchError } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('id', blockId)
        .eq('blocker_id', user.id)
        .single();
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId)
        .eq('blocker_id', user.id);
      
      if (error) throw error;
      
      // Return the blocked user ID for potential friend request
      return blockData?.blocked_id;
    },
    onSuccess: (blockedUserId) => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      logActivity('Unblocked a user', { action: 'unblock_user', blocked_user_id: blockedUserId });
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
      logActivity('Ended a device session', { action: 'end_session' });
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
      logActivity('Logged out from all other devices', { action: 'end_all_other_sessions' });
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
        .update(updates as any)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      logActivity('Updated profile information', { action: 'update_profile' });
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
      logActivity('Changed privacy settings', { action: 'update_privacy' });
      toast({ title: 'Privacy updated', description: 'Your privacy settings have been saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Change password (verifies current password first)
  const changePassword = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      if (!user?.email) throw new Error('No email associated with this account');
      if (!currentPassword) throw new Error('Current password is required');

      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      logActivity('Changed account password', { action: 'change_password' });
      toast({ title: 'Password updated', description: 'Your password has been changed successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Deactivate account
  const deactivateAccount = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      queryClient.setQueryData(['user-sessions', user.id], []);
      const { error } = await supabase.rpc('deactivate_my_account');
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: 'Account deactivated', description: 'You have been signed out from all devices. Sign in again to reactivate.' });
      clearDeviceToken();
      // Global sign-out: invalidates ALL refresh tokens across every device
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        await supabase.auth.signOut();
      }
      window.location.href = '/auth';
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Check if a user is blocked
  const isUserBlocked = (userId: string) => {
    return blockedUsers?.some((block: any) => block.blocked_id === userId) || false;
  };

  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profile_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Activity not found or already deleted');
    },
    onMutate: async (activityId: string) => {
      if (!user) return {};
      const key = ['profile-activities', user.id] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previousActivities = queryClient.getQueryData<any[]>(key) || [];

      queryClient.setQueryData<any[]>(key, (old = []) => old.filter((activity: any) => activity.id !== activityId));

      return { previousActivities };
    },
    onSuccess: () => {
      toast({ title: 'Activity deleted', description: 'Activity removed from your log' });
    },
    onError: (error: any, _activityId, context) => {
      if (user && context?.previousActivities) {
        queryClient.setQueryData(['profile-activities', user.id], context.previousActivities);
      }
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-activities', user?.id] });
    },
  });

  const deleteActivitiesByWeek = useMutation({
    mutationFn: async (activityIds: string[]) => {
      if (!user) throw new Error('Not authenticated');
      if (!activityIds.length) return;

      const { data, error } = await supabase
        .from('profile_activities')
        .delete()
        .in('id', activityIds)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No activities were deleted');
    },
    onMutate: async (activityIds: string[]) => {
      if (!user) return {};
      const key = ['profile-activities', user.id] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previousActivities = queryClient.getQueryData<any[]>(key) || [];

      const idSet = new Set(activityIds);
      queryClient.setQueryData<any[]>(key, (old = []) => old.filter((activity: any) => !idSet.has(activity.id)));

      return { previousActivities };
    },
    onSuccess: () => {
      toast({ title: 'Weekly activities deleted', description: 'Selected week has been cleared' });
    },
    onError: (error: any, _activityIds, context) => {
      if (user && context?.previousActivities) {
        queryClient.setQueryData(['profile-activities', user.id], context.previousActivities);
      }
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-activities', user?.id] });
    },
  });

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
    deactivateAccount,
    deleteActivity,
    deleteActivitiesByWeek,
    isUserBlocked,
  };
};
