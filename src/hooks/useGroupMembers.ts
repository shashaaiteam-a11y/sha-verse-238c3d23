import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useGroupMembers = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId || !user) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id, role, status, joined_at, warnings, muted_until,
          profiles:user_id (id, display_name, avatar_url, username)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && !!user,
  });

  const kickMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Member removed' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const banMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'banned' })
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Member banned' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const muteMember = useMutation({
    mutationFn: async ({ userId, hours }: { userId: string; hours: 2 | 4 | 6 | 8 }) => {
      const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'muted', muted_until: mutedUntil })
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Member muted' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'member' | 'moderator' | 'admin' }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ role })
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Role updated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const issueWarning = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.from('group_user_warnings').insert({
        group_id: groupId!,
        user_id: userId,
        issued_by: user!.id as any,
        reason,
      });
      if (error) throw error;
      // Increment warning count
      const { error: err2 } = await supabase.rpc('increment_member_warnings', {
        p_group_id: groupId!,
        p_user_id: userId,
      });
      // Non-fatal if rpc not set up yet
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({ title: 'Warning issued' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return { members, isLoading, kickMember, banMember, muteMember, updateRole, issueWarning };
};
