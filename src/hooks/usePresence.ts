/**
 * usePresence - Online/Offline status like WhatsApp
 * Shows "Online" or "Last seen X minutes ago"
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPresence {
  user_id: string;
  online_at: string;
  status: 'online' | 'offline';
}

// Track the current user's own presence + get others' presence
export const usePresence = (channelName: string = 'global-presence') => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserPresence>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel(channelName);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<UserPresence>();
        const flatState: Record<string, UserPresence> = {};

        Object.entries(state).forEach(([, presences]) => {
          presences.forEach((p) => {
            flatState[p.user_id] = p;
          });
        });

        setOnlineUsers(flatState);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((p: any) => {
          setOnlineUsers(prev => ({ ...prev, [p.user_id]: p as UserPresence }));
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p: any) => {
          setOnlineUsers(prev => {
            const next = { ...prev };
            delete next[p.user_id];
            return next;
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            status: 'online',
          });
          setIsReady(true);
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id, channelName]);

  const isUserOnline = useCallback((userId: string) => {
    return !!onlineUsers[userId];
  }, [onlineUsers]);

  const getLastSeen = useCallback((userId: string) => {
    const presence = onlineUsers[userId];
    if (!presence) return null;
    return new Date(presence.online_at);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getLastSeen,
    isReady,
    onlineCount: Object.keys(onlineUsers).length,
  };
};

// Simple hook - just check if ONE specific user is online
export const useIsUserOnline = (targetUserId?: string) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !targetUserId) return;

    const channel = supabase.channel(`presence-${targetUserId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<UserPresence>();
        const allPresences = Object.values(state).flat();
        const targetPresence = allPresences.find((p: UserPresence) => p.user_id === targetUserId);
        setIsOnline(!!targetPresence);
        if (targetPresence) {
          setLastSeen(new Date(targetPresence.online_at));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            status: 'online',
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, targetUserId]);

  return { isOnline, lastSeen };
};
