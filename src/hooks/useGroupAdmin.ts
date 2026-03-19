import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useGroupAdmin = (groupId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin/moderator
  const { data: userRole } = useQuery({
    queryKey: ['group-role', groupId, user?.id],
    queryFn: async () => {
      if (!user || !groupId) return null;
      
      // Check if user is creator
      const { data: group } = await supabase
        .from('groups')
        .select('creator_id')
        .eq('id', groupId)
        .single();
      
      if (group?.creator_id === user.id) return 'admin';
      
      // Check group_roles
      const { data: role } = await supabase
        .from('group_roles')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (role) return role.role;
      
      // Check group_members
      const { data: member } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return member?.role || null;
    },
    enabled: !!user && !!groupId,
  });

  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;

  // Fetch group details for editing
  const { data: groupDetails, isLoading: groupLoading } = useQuery({
    queryKey: ['group-details', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch all members with profiles
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members-admin', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles:user_id (id, display_name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && isModerator,
  });

  // Fetch join requests
  const { data: joinRequests } = useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          profiles:user_id (id, display_name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && isModerator,
  });

  // Fetch group rules
  const { data: rules } = useQuery({
    queryKey: ['group-rules', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_rules')
        .select('*')
        .eq('group_id', groupId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId,
  });

  // Fetch blocked users
  const { data: blockedUsers } = useQuery({
    queryKey: ['group-blocked-users', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_blocked_users')
        .select(`
          *,
          profiles:user_id (id, display_name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('blocked_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && isModerator,
  });

  // Fetch pending posts (if post approval is required)
  const { data: pendingPosts } = useQuery({
    queryKey: ['group-pending-posts', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          *,
          profiles:user_id (id, display_name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && isModerator,
  });

  // Fetch live insights (computed from real tables)
  const { data: insights } = useQuery({
    queryKey: ['group-insights', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Total members
      const { count: totalMembers } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);

      // New members today
      const { count: newToday } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('joined_at', todayISO);

      // Total posts
      const { count: totalPosts } = await supabase
        .from('group_posts')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('approval_status', 'approved');

      // Posts today
      const { count: postsToday } = await supabase
        .from('group_posts')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('created_at', todayISO);

      // Pending join requests
      const { count: pendingRequests } = await supabase
        .from('group_join_requests')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'pending');

      // Blocked count
      const { count: blockedCount } = await supabase
        .from('group_blocked_users')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);

      return {
        totalMembers: totalMembers ?? 0,
        newToday: newToday ?? 0,
        totalPosts: totalPosts ?? 0,
        postsToday: postsToday ?? 0,
        pendingRequests: pendingRequests ?? 0,
        blockedCount: blockedCount ?? 0,
      };
    },
    enabled: !!groupId && isModerator,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  // ── Realtime subscriptions ───────────────────────────────────────────
  useEffect(() => {
    if (!groupId || !isModerator) return;

    const channel = supabase
      .channel(`group-admin-${groupId}`)
      // New join request
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_join_requests',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      })
      // Members change (join / leave / role update)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
        // Also refresh current user's own role so isAdmin/isModerator updates immediately
        queryClient.invalidateQueries({ queryKey: ['group-role', groupId] });
        queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      })
      // Posts change (new post / approved / rejected)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_posts',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      })
      // Rules change
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_rules',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-rules', groupId] });
      })
      // Blocked users change
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'group_blocked_users',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-blocked-users', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      })
      // Group settings change
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'groups',
        filter: `id=eq.${groupId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-details', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        queryClient.invalidateQueries({ queryKey: ['my-groups'] });
        queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, isModerator, queryClient]);
  // ─────────────────────────────────────────────────────────────────────

  // Update group settings
  const updateGroup = useMutation({
    mutationFn: async (updates: {
      name?: string;
      description?: string;
      avatar_url?: string;
      cover_url?: string;
      is_private?: boolean;
      require_join_approval?: boolean;
      require_post_approval?: boolean;
    }) => {
      if (!groupId) throw new Error('No group ID');
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-details', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      toast({ title: 'Group settings updated!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update group', description: error.message, variant: 'destructive' });
    },
  });

  // Upload group image helper
  const uploadImage = useMutation({
    mutationFn: async ({ file, type }: { file: File, type: 'avatar' | 'cover' }) => {
      if (!groupId) throw new Error('No group ID');
      
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${groupId}-${type}-${Date.now()}.${fileExt}`;
      // Path must start with userId to satisfy RLS policy
      const filePath = `${user.id}/groups/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Instantly update the group with the new URL
      const updateData = type === 'avatar' 
        ? { avatar_url: publicUrl }
        : { cover_url: publicUrl };
        
      await updateGroup.mutateAsync(updateData);
      
      return publicUrl;
    },
    onSuccess: (_, { type }) => {
      toast({ title: `${type === 'avatar' ? 'Profile' : 'Cover'} image updated successfully!` });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Upload failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Remove group image (avatar or cover)
  const removeImage = useMutation({
    mutationFn: async (type: 'avatar' | 'cover') => {
      if (!groupId) throw new Error('No group ID');
      const updateData = type === 'avatar'
        ? { avatar_url: null }
        : { cover_url: null };

      const { error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ['group-details', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({ title: `${type === 'avatar' ? 'Profile' : 'Cover'} image removed` });
    },
    onError: (error: any) => {
      toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
    },
  });

  // Approve join request
  const approveJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      // Fetch user_id from DB directly — never rely on stale closure
      const { data: reqData, error: fetchError } = await supabase
        .from('group_join_requests')
        .select('user_id, group_id')
        .eq('id', requestId)
        .single();
      if (fetchError || !reqData) throw new Error('Request not found');

      // Update request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (updateError) throw updateError;

      // Add as member — upsert to survive duplicate-key edge cases
      const { error: memberError } = await supabase
        .from('group_members')
        .upsert(
          { group_id: groupId, user_id: reqData.user_id, role: 'member' },
          { onConflict: 'group_id,user_id', ignoreDuplicates: true }
        );
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      // Approved user's my-groups + pending-requests update via realtime on their client
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests'] });
      toast({ title: 'Member approved!' });
    },
  });

  // Reject join request
  const rejectJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      queryClient.invalidateQueries({ queryKey: ['pending-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      toast({ title: 'Request rejected' });
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      // Removed user's group list + suggestions update via realtime on their client
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-role', groupId] });
      toast({ title: 'Member removed' });
    },
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      // Remove from members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      // Add to blocked
      const { error } = await supabase
        .from('group_blocked_users')
        .insert({ group_id: groupId, user_id: userId, blocked_by: user?.id, reason });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-blocked-users', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-role', groupId] });
      toast({ title: 'User blocked' });
    },
  });

  // Unblock user
  const unblockUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_blocked_users')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-blocked-users', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-insights', groupId] });
      queryClient.invalidateQueries({ queryKey: ['suggested-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      toast({ title: 'User unblocked' });
    },
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Update in group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .update({ role })
        .eq('group_id', groupId)
        .eq('user_id', userId);
      
      if (memberError) throw memberError;

      // Also update/insert in group_roles if admin/moderator
      if (role === 'admin' || role === 'moderator') {
        const { error: roleError } = await supabase
          .from('group_roles')
          .upsert({ group_id: groupId, user_id: userId, role, assigned_by: user?.id });
        if (roleError) throw roleError;
      } else {
        // Remove from group_roles if demoted
        await supabase
          .from('group_roles')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      // Invalidate the target member's role so their access updates immediately
      queryClient.invalidateQueries({ queryKey: ['group-role', groupId] });
      // my-groups carries the role field — refresh it so GroupDetail isAdminOrMod updates
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      // Refresh post-related queries so post approval rules apply to new role
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast({ title: 'Role updated!' });
    },
  });

  // Approve post
  const approvePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('group_posts')
        .update({ approval_status: 'approved' })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast({ title: 'Post approved!' });
    },
  });

  // Reject post
  const rejectPost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('group_posts')
        .update({ approval_status: 'rejected' })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
      toast({ title: 'Post rejected' });
    },
  });

  // Delete post
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('group_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
      toast({ title: 'Post deleted' });
    },
  });

  // Pin/unpin post
  const togglePinPost = useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('group_posts')
        .update({ pinned })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      toast({ title: 'Post updated!' });
    },
  });

  // Create rule
  const createRule = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      const position = (rules?.length || 0) + 1;
      const { error } = await supabase
        .from('group_rules')
        .insert({ group_id: groupId, title, description, position, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-rules', groupId] });
      toast({ title: 'Rule created!' });
    },
  });

  // Update rule
  const updateRule = useMutation({
    mutationFn: async ({ ruleId, title, description }: { ruleId: string; title: string; description?: string }) => {
      const { error } = await supabase
        .from('group_rules')
        .update({ title, description })
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-rules', groupId] });
      toast({ title: 'Rule updated!' });
    },
  });

  // Delete rule
  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('group_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-rules', groupId] });
      toast({ title: 'Rule deleted' });
    },
  });

  return {
    userRole,
    isAdmin,
    isModerator,
    groupDetails,
    groupLoading,
    members,
    membersLoading,
    joinRequests,
    rules,
    blockedUsers,
    pendingPosts,
    insights,
    updateGroup,
    uploadImage,
    removeImage,
    approveJoinRequest,
    rejectJoinRequest,
    removeMember,
    blockUser,
    unblockUser,
    updateMemberRole,
    approvePost,
    rejectPost,
    deletePost,
    togglePinPost,
    createRule,
    updateRule,
    deleteRule,
  };
};
