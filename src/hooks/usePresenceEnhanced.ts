/**
 * usePresenceEnhanced - Online/Offline/Last Seen with privacy middleware
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { RTChatService } from '@/services/RTChatService';

export const usePresenceTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const setOnline = async () => {
      await RTChatService.presence.setOnline(user.id);
    };

    setOnline();

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await RTChatService.presence.setOffline(user.id);
      } else {
        await RTChatService.presence.setOnline(user.id);
      }
    };

    const handleBeforeUnload = async () => {
      await RTChatService.presence.setOffline(user.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);
};

export const useUserPresence = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  useEffect(() => {
    if (!user?.id || !targetUserId) return;

    let isActive = true;

    const syncPresence = async () => {
      const presence = await RTChatService.presence.getUserPresence(
        targetUserId,
        user.id,
        userSettings
      );

      if (!isActive) return;

      if (presence) {
        setIsOnline(presence.is_online);
        setLastSeen(new Date(presence.last_seen));
        return;
      }

      setIsOnline(false);
      setLastSeen(null);
    };

    void syncPresence();

    const channel = supabase
      .channel(`user-presence-${targetUserId}-${user.id}-${Math.random().toString(36).slice(2, 10)}`)
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

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, targetUserId, userSettings]);

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
