import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useGroupJoinRequests = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending join requests for admins/mods
  const { data: joinRequests, isLoading } = useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: async () => {
      if (!groupId || !user) return [];
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          id, status, created_at, user_id,
          profiles:user_id (id, display_name, avatar_url, username)
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && !!user,
  });

  // Check if current user has a pending request
  const { data: myRequest } = useQuery({
    queryKey: ['my-join-request', groupId, user?.id],
    queryFn: async () => {
      if (!groupId || !user) return null;
      const { data } = await supabase
        .from('group_join_requests')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!groupId && !!user,
  });

  // Helper: send notification to a user
  const sendNotification = async (
    toUserId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ) => {
    try {
      await supabase.from('notifications' as any).insert({
        user_id: toUserId,
        type,
        title,
        message,
        data,
        read: false,
      });
    } catch (_) {
      // Notification failure should not block main action
    }
  };

  // Fetch group name helper
  const getGroupName = async (gid: string): Promise<string> => {
    const { data } = await supabase
      .from('groups')
      .select('name')
      .eq('id', gid)
      .single();
    return (data as any)?.name || 'the group';
  };

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      // Add to group_members
      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({ group_id: groupId!, user_id: userId, role: 'member' });
      if (memberErr) throw memberErr;
      // Update request status
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved', reviewed_by: user!.id })
        .eq('id', requestId);
      if (error) throw error;
      // Send notification to the approved user
      const groupName = await getGroupName(groupId!);
      await sendNotification(
        userId,
        'group_join_approved',
        'Join Request Approved ✅',
        `Your request to join "${groupName}" has been approved. Welcome!`,
        { group_id: groupId }
      );
      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Request approved' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected', reviewed_by: user!.id })
        .eq('id', requestId);
      if (error) throw error;
      // Send notification to the rejected user
      const groupName = await getGroupName(groupId!);
      await sendNotification(
        userId,
        'group_join_rejected',
        'Join Request Declined',
        `Your request to join "${groupName}" was not approved.`,
        { group_id: groupId }
      );
      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      toast({ title: 'Request rejected' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return { joinRequests, isLoading, myRequest, approveRequest, rejectRequest };
};
