import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
          id, status, created_at,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      toast({ title: 'Request approved' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected', reviewed_by: user!.id })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
      toast({ title: 'Request rejected' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return { joinRequests, isLoading, myRequest, approveRequest, rejectRequest };
};
