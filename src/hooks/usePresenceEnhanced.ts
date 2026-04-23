/**
 * usePresenceEnhanced - WhatsApp-style Online / Offline / Last Seen
 *
 * - Heartbeat every 25s while the tab is visible (so the server knows we're alive
 *   even if `beforeunload` never fires, e.g. on mobile tab switch / browser kill).
 * - Marks offline on tab hide / unload.
 * - Fetches OTHER users' presence through the SECURITY DEFINER RPC
 *   `get_user_presence_safe`, which enforces:
 *     1. block check (either side blocked => hidden)
 *     2. last_seen_visibility (everyone / contacts / nobody)
 *     3. online_status_visibility (everyone / contacts / nobody)
 *     4. "Give and Take" rule (if viewer hides everything, they see nothing)
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RTChatService } from '@/services/RTChatService';

const HEARTBEAT_MS = 25_000;

export const usePresenceTracker = () => {
  const { user } = useAuth();
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const setOnline = () => {
      void RTChatService.presence.setOnline(user.id);
    };
    const setOffline = () => {
      void RTChatService.presence.setOffline(user.id);
    };

    // Initial mark + start heartbeat
    setOnline();
    heartbeatRef.current = window.setInterval(() => {
      if (!document.hidden) setOnline();
    }, HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    const handleBeforeUnload = () => {
      // best effort — browser may not wait for promise
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      setOffline();
    };
  }, [user?.id]);
};

export const useUserPresence = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.id || !targetUserId) {
      setIsOnline(false);
      setLastSeen(null);
      return;
    }

    let isActive = true;

    const syncPresence = async () => {
      // Server-side privacy enforcement — no need to pass settings from client
      const presence = await RTChatService.presence.getUserPresence(targetUserId);
      if (!isActive) return;

      if (presence) {
        setIsOnline(!!presence.is_online);
        setLastSeen(presence.last_seen ? new Date(presence.last_seen) : null);
      } else {
        // Hidden by privacy / blocked / no row
        setIsOnline(false);
        setLastSeen(null);
      }
    };

    void syncPresence();

    const channel = supabase
      .channel(
        `user-presence-${targetUserId}-${user.id}-${Math.random()
          .toString(36)
          .slice(2, 10)}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          void syncPresence();
        }
      )
      .subscribe();

    // Light polling fallback (every 30s) to cover the case where the target's
    // tab dies without writing offline — the server-side last_seen will still
    // be old, and we re-render the relative time string.
    const pollId = window.setInterval(() => {
      if (!document.hidden) void syncPresence();
    }, 30_000);

    return () => {
      isActive = false;
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, targetUserId]);

  return { isOnline, lastSeen };
};

export const formatLastSeen = (date: Date | null): string => {
  if (!date) return 'offline';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return formatter.format(date);
};

export const useChatPartnerPresence = (partnerId?: string) => {
  const { isOnline, lastSeen } = useUserPresence(partnerId);

  const statusText = isOnline
    ? 'Online'
    : lastSeen
      ? `Last seen ${formatLastSeen(lastSeen)}`
      : 'Offline';

  return {
    isOnline,
    lastSeen,
    statusText,
  };
};
