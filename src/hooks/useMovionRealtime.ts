import { useEffect } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleVisible } from '@/lib/navigation/moduleVisibility';
import { retryWatchReports } from '@/lib/movion/watchOutbox';
import { createRealtimeBatch } from '@/lib/movion/realtimeBatch';

const videoKeys = ['video', 'videos', 'shorts', 'long-videos', 'trending-videos', 'channel-videos',
  'subscribed-videos', 'video-analytics', 'creator-stats', 'channel-watch-analytics'];
const channelKeys = ['channel', 'channels', 'my-channel', 'my-creator-channel', 'movion-subscriber-count',
  'subscriptions', ...videoKeys];
const subscriptionKeys = ['subscriptions', 'is-subscribed', 'subscribed-videos', ...channelKeys];
const allKeys = [...subscriptionKeys, 'watch-history', 'watch-later', 'is-watch-later', 'saved-videos',
  'is-saved', 'playlists', 'video-like', 'video-dislike', 'video-comments', 'studio-all-comments'];
const connections = new WeakMap<QueryClient, Map<string, { refs: number; close: () => void }>>();

/** One shared connection per cache/account, even when several Movion components need updates. */
export const useMovionRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visible = useModuleVisible();
  const userId = user?.id;
  useEffect(() => {
    if (!visible) return;
    let clients = connections.get(queryClient);
    if (!clients) { clients = new Map(); connections.set(queryClient, clients); }
    const key = userId || 'public';
    let connection = clients.get(key);
    if (!connection) {
      const batch = createRealtimeBatch(key => { void queryClient.invalidateQueries({ queryKey: [key] }); });
      const channel = supabase.channel(`movion-${key}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => batch.add(videoKeys))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => batch.add(channelKeys))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => batch.add(['video-comments', 'studio-all-comments', ...videoKeys]));
      if (userId) {
        const privateTables: Record<string, string[]> = {
          watch_history: ['watch-history'], watch_later: ['watch-later', 'is-watch-later'],
          saved_videos: ['saved-videos', 'is-saved'], playlists: ['playlists'],
          likes: ['video-like', 'video-dislike', ...videoKeys],
          video_dislikes: ['video-like', 'video-dislike', ...videoKeys],
          subscriptions: subscriptionKeys,
        };
        for (const [table, keys] of Object.entries(privateTables)) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => batch.add(keys));
        }
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'video_analytics' }, () => batch.add(['channel-watch-analytics', 'video-analytics']));
      }
      channel.subscribe(status => {
        // Initial connect and every reconnect reconcile events missed while disconnected.
        if (status === 'SUBSCRIBED') { batch.add(allKeys); if (userId) void retryWatchReports(userId); }
      });
      const catchUp = () => { batch.add(allKeys); if (userId) void retryWatchReports(userId); };
      const retryTimer = userId ? setInterval(() => void retryWatchReports(userId), 15000) : undefined;
      window.addEventListener('online', catchUp);
      connection = { refs: 0, close: () => {
        clearInterval(retryTimer); batch.dispose(); window.removeEventListener('online', catchUp); void supabase.removeChannel(channel);
      } };
      clients.set(key, connection);
    }
    connection.refs++;
    return () => {
      if (--connection.refs === 0) { connection.close(); clients.delete(key); }
    };
  }, [queryClient, userId, visible]);
};

export const useGlobalVideoRealtime = useMovionRealtime;
