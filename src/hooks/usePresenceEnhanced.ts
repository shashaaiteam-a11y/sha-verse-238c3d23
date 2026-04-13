/**
 * usePresenceEnhanced - Online/Offline/Last Seen with privacy middleware
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { RTChatService } from '@/services/RTChatService';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  status: 'online' | 'offline';
  last_seen: string;
}

/**
 * Track current user's presence (online/offline)
 */
export const usePresenceTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Set online when component mounts
    const setOnline = async () => {
      await RTChatService.presence.setOnline(user.id);
    };

    setOnline();

    // Listen for visibility changes (app background/foreground)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await RTChatService.presence.setOffline(user.id);
      } else {
        await RTChatService.presence.setOnline(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set offline on unmount
    const handleBeforeUnload = async () => {
      await RTChatService.presence.setOffline(user.id);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);
};

/**
 * Get another user's presence with privacy checks
 */
export const useUserPresence = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Get user settings for privacy check
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data } = await supabase
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

    const subscribePresence = async () => {
      // Get initial presence
      const presence = await RTChatService.presence.getUserPresence(
        targetUserId,
        user.id,
        userSettings
      );

      if (presence) {
        setIsOnline(presence.is_online);
        setLastSeen(new Date(presence.last_seen));
      }
    };

    subscribePresence();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`presence-${targetUserId}`)
      .on('presence', { event: 'sync' }, async () => {
        // Re-check with privacy middleware
        const presence = await RTChatService.presence.getUserPresence(
          targetUserId,
          user.id,
          userSettings
        );

        if (presence) {
          setIsOnline(presence.is_online);
          setLastSeen(new Date(presence.last_seen));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, targetUserId, userSettings]);

  return { isOnline, lastSeen };
};

/**
 * Format last seen time (like WhatsApp: "2 minutes ago", "Yesterday", etc.)
 */
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

  // Format as date: "Jan 15, 2:30 PM"
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return formatter.format(date);
};

/**
 * Get user presence for chat header
 */
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
