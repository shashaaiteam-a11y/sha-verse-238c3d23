import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

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
          id, target_type, target_id, reason, details, status, created_at,
          reporter:reported_by (display_name, avatar_url, username)
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
      details,
    }: {
      targetType: 'post' | 'message' | 'member' | 'group';
      targetId: string;
      reason: string;
      details?: string;
    }) => {
      if (!user || !groupId) throw new Error('Not ready');
      const { error } = await supabase.from('group_reports').insert({
        group_id: groupId,
        reported_by: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details || null,
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: 'Report submitted. We will review it.' }),
    onError: (e: any) => toast({ title: 'Failed to report', description: e.message, variant: 'destructive' }),
  });

  const updateReportStatus = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: 'reviewed' | 'dismissed' | 'actioned' }) => {
      const { error } = await supabase
        .from('group_reports')
        .update({ status, reviewed_by: user!.id })
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-reports', groupId] });
      toast({ title: 'Report updated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return { reports, isLoading, submitReport, updateReportStatus };
};
