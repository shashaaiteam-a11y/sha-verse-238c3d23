// MOVION Creator Studio analytics (server-computed, owner-only)
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChannelWatchAnalyticsRow {
  video_id: string;
  title: string;
  is_short: boolean;
  duration_seconds: number | null;
  views: number;
  unique_viewers: number;
  watch_seconds: number;
  avg_view_duration_seconds: number;
  avg_percent_viewed: number;
  likes: number;
  comments: number;
}

export const useChannelWatchAnalytics = (channelId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['channel-watch-analytics', channelId],
    queryFn: async () => {
      if (!channelId) return [] as ChannelWatchAnalyticsRow[];
      const { data, error } = await supabase.rpc('get_channel_watch_analytics', {
        _channel_id: channelId,
      });
      if (error) throw error;
      return (data || []) as unknown as ChannelWatchAnalyticsRow[];
    },
    enabled: !!channelId,
    staleTime: 15000,
  });

  // Realtime: refresh when daily analytics or video counters change
  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`movion-analytics-${channelId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_analytics' }, () => {
        queryClient.invalidateQueries({ queryKey: ['channel-watch-analytics', channelId] });
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'videos', filter: `channel_id=eq.${channelId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['channel-watch-analytics', channelId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, queryClient]);

  const rows = query.data || [];
  const totals = {
    views: rows.reduce((s, r) => s + Number(r.views || 0), 0),
    watchSeconds: rows.reduce((s, r) => s + Number(r.watch_seconds || 0), 0),
    uniqueViewers: rows.reduce((s, r) => s + Number(r.unique_viewers || 0), 0),
    avgViewDuration:
      rows.length > 0
        ? rows.reduce((s, r) => s + Number(r.avg_view_duration_seconds || 0), 0) / rows.length
        : 0,
    avgPercentViewed:
      rows.length > 0
        ? rows.reduce((s, r) => s + Number(r.avg_percent_viewed || 0), 0) / rows.length
        : 0,
  };

  return { rows, totals, isLoading: query.isLoading };
};

export default useChannelWatchAnalytics;
