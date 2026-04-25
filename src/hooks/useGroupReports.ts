import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

/**
 * Group reports hook — matches actual DB schema:
 *   reporter_id, reported_user_id, reported_post_id, reason, description, status, created_at
 *
 * `targetType` ('post' | 'member') is a UI-side hint that maps to the right column.
 */
export const useGroupReports = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['group-reports', groupId],
    queryFn: async () => {
      if (!groupId || !user) return [];
      const { data, error } = await supabase
        .from('group_reports')
        .select(`
          id, reason, description, status, created_at,
          reported_user_id, reported_post_id, reporter_id, resolved_at,
          reporter:reporter_id (id, display_name, avatar_url, username),
          reported_user:reported_user_id (id, display_name, avatar_url, username)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && !!user,
  });

  const submitReport = useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      reason,
      description,
    }: {
      targetType: 'post' | 'member';
      targetId: string;
      reason: string;
      description?: string;
    }) => {
      if (!user || !groupId) throw new Error('Not ready');
      const payload: Record<string, any> = {
        group_id: groupId,
        reporter_id: user.id,
        reason,
        description: description || null,
        status: 'pending',
      };
      if (targetType === 'post') payload.reported_post_id = targetId;
      else payload.reported_user_id = targetId;

      const { error } = await supabase.from('group_reports').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-reports', groupId] });
      toast({ title: 'Report submitted. We will review it.' });
    },
    onError: (e: any) =>
      toast({ title: 'Failed to report', description: e.message, variant: 'destructive' }),
  });

  const updateReportStatus = useMutation({
    mutationFn: async ({
      reportId,
      status,
    }: {
      reportId: string;
      status: 'reviewed' | 'dismissed' | 'actioned' | 'resolved';
    }) => {
      const { error } = await supabase
        .from('group_reports')
        .update({
          status,
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
        } as any)
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-reports', groupId] });
      toast({ title: 'Report updated' });
    },
    onError: (e: any) =>
      toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  // Realtime: live admin updates as new reports come in or status changes
  useEffect(() => {
    if (!groupId || !user) return;
    const channel = supabase
      .channel(`group-reports-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_reports', filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-reports', groupId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user, queryClient]);

  const pendingCount = (reports || []).filter((r: any) => r.status === 'pending').length;

  return { reports, pendingCount, isLoading, submitReport, updateReportStatus };
};
