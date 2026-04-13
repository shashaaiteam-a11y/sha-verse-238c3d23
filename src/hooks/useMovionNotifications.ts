import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MovionNotificationItem {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  channelId: string;
  channelName: string;
  channelAvatar: string | null;
  category: string | null;
  uploadedAt: string;
  seen: boolean;
}

const STORAGE_KEY = 'movion_seen_notifications';
const LAST_FETCH_KEY = 'movion_notifications_last_fetch';
const FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getSeenIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveSeenIds = (ids: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
};

export const useMovionNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MovionNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get user subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('user_id', user.id);

      if (!subs || subs.length === 0) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      const channelIds = subs.map((s: any) => s.channel_id);

      // Get latest 30 videos from subscribed channels (within last 7 days for relevance)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: videos } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          channel_id,
          category,
          created_at,
          is_short,
          channels:channel_id (
            id,
            name,
            avatar_url
          )
        `)
        .in('channel_id', channelIds)
        .eq('is_short', false)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(30);

      const seenIds = getSeenIds();

      const notifs: MovionNotificationItem[] = (videos || []).map((v: any) => ({
        id: v.id,
        videoId: v.id,
        videoTitle: v.title || 'Untitled Video',
        videoThumbnail: v.thumbnail_url,
        channelId: v.channel_id,
        channelName: v.channels?.name || 'Unknown Channel',
        channelAvatar: v.channels?.avatar_url,
        category: v.category,
        uploadedAt: v.created_at,
        seen: seenIds.includes(v.id),
      }));

      setNotifications(notifs);
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    } catch (err) {
      console.error('Error fetching movion notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark a single notification as seen
  const markAsSeen = useCallback((notifId: string) => {
    const seenIds = getSeenIds();
    if (!seenIds.includes(notifId)) {
      saveSeenIds([...seenIds, notifId]);
    }
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, seen: true } : n)
    );
  }, []);

  // Mark all as seen
  const markAllAsSeen = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    const seenIds = getSeenIds();
    const merged = Array.from(new Set([...seenIds, ...allIds]));
    saveSeenIds(merged);
    setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
  }, [notifications]);

  // Initial fetch + 24-hour auto-refresh
  useEffect(() => {
    if (!user) return;

    const lastFetch = parseInt(localStorage.getItem(LAST_FETCH_KEY) || '0', 10);
    const needsFetch = Date.now() - lastFetch > FETCH_INTERVAL_MS || lastFetch === 0;

    if (needsFetch) {
      fetchNotifications();
    } else {
      // Still load from the subscriptions but use cached seen state
      fetchNotifications();
    }

    // 24-hour auto-refresh timer
    timerRef.current = setInterval(() => {
      fetchNotifications();
    }, FETCH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, fetchNotifications]);

  // Realtime: when a new video is inserted, immediately add it to notifications if from subscribed channel
  useEffect(() => {
    if (!user) return;

    const setupRealtime = async () => {
      // Get subscription channel IDs
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('user_id', user.id);

      const channelIds = new Set((subs || []).map((s: any) => s.channel_id));
      if (channelIds.size === 0) return;

      channelRef.current = supabase
        .channel(`movion-notif-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'videos',
          },
          async (payload) => {
            const newVideo = payload.new as any;
            if (!newVideo || !channelIds.has(newVideo.channel_id)) return;
            if (newVideo.is_short) return; // skip shorts

            // Fetch channel info
            const { data: channelData } = await supabase
              .from('channels')
              .select('id, name, avatar_url')
              .eq('id', newVideo.channel_id)
              .single();

            const seenIds = getSeenIds();
            const newNotif: MovionNotificationItem = {
              id: newVideo.id,
              videoId: newVideo.id,
              videoTitle: newVideo.title || 'Untitled Video',
              videoThumbnail: newVideo.thumbnail_url,
              channelId: newVideo.channel_id,
              channelName: channelData?.name || 'Unknown Channel',
              channelAvatar: channelData?.avatar_url,
              category: newVideo.category,
              uploadedAt: newVideo.created_at,
              seen: seenIds.includes(newVideo.id),
            };

            setNotifications(prev => [newNotif, ...prev]);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.seen).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsSeen,
    markAllAsSeen,
    refresh: fetchNotifications,
  };
};
