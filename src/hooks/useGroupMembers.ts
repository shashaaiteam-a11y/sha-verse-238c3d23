import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

/**
 * Group members admin hook.
 * Schema: group_members has only id, group_id, user_id, role, status, joined_at.
 * Warnings are stored in `group_user_warnings` (count joined per user).
 * Mute is implemented as `status = 'muted'` (no expiry column persisted).
 */
export const useGroupMembers = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members-with-warnings', groupId],
    queryFn: async () => {
      if (!groupId || !user) return [];
      const { data: rows, error } = await supabase
        .from('group_members')
        .select(`
          id, role, status, joined_at, group_id, user_id,
          profiles:user_id (id, display_name, avatar_url, username)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });
      if (error) throw error;

      const userIds = (rows || []).map((r: any) => r.user_id);
      const warningsMap: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: warns } = await supabase
          .from('group_user_warnings')
          .select('user_id')
          .eq('group_id', groupId)
          .in('user_id', userIds);
        (warns || []).forEach((w: any) => {
          warningsMap[w.user_id] = (warningsMap[w.user_id] || 0) + 1;
        });
      }

      return (rows || []).map((r: any) => ({
        ...r,
        warnings: warningsMap[r.user_id] || 0,
      }));
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
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
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
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      toast({ title: 'Member banned' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const muteMember = useMutation({
    mutationFn: async ({ userId }: { userId: string; hours?: 2 | 4 | 6 | 8 }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'muted' })
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      toast({ title: 'Member muted' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const unmuteMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('group_id', groupId!)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      toast({ title: 'Member unmuted' });
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
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-admin', groupId] });
      toast({ title: 'Role updated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const issueWarning = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.from('group_user_warnings').insert({
        group_id: groupId!,
        user_id: userId,
        warned_by: user!.id,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members-with-warnings', groupId] });
      toast({ title: 'Warning issued' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return {
    members,
    isLoading,
    kickMember,
    banMember,
    muteMember,
    unmuteMember,
    updateRole,
    issueWarning,
  };
};
