import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleVisible } from '@/lib/navigation/moduleVisibility';
import { useMovionRealtime } from '@/hooks/useMovionRealtime';

export interface ChannelWatchAnalyticsRow {
  video_id: string; title: string; is_short: boolean; duration_seconds: number | null;
  views: number; unique_viewers: number; watch_seconds: number;
  avg_view_duration_seconds: number; avg_percent_viewed: number; likes: number; comments: number;
}

export const useChannelWatchAnalytics = (channelId?: string) => {
  const { user } = useAuth();
  const visible = useModuleVisible();
  useMovionRealtime();
  const query = useQuery({
    queryKey: ['channel-watch-analytics', channelId, user?.id],
    enabled: !!channelId && !!user && visible,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channel_watch_analytics', { _channel_id: channelId! });
      if (error) throw error;
      return (data || []) as ChannelWatchAnalyticsRow[];
    },
    staleTime: 5000,
    // Reconcile after missed realtime messages without polling hidden tabs/modules.
    refetchInterval: visible ? 15000 : false,
  });
  const rows = query.data || [];
  return { rows, totals: {
    views: rows.reduce((s,r) => s + Number(r.views || 0),0),
    watchSeconds: rows.reduce((s,r) => s + Number(r.watch_seconds || 0),0),
  }, isLoading: query.isLoading, error: query.error };
};
export default useChannelWatchAnalytics;
