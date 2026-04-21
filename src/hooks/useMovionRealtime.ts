import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * MOVION Realtime Hook
 * Subscribes to realtime changes for instant UI updates without refresh
 */
export const useMovionRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // 🚀 OPTIMIZATION: Debounced invalidations to prevent storms
    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 2000;

    const debouncedInvalidate = (keys: string[][]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      }, DEBOUNCE_MS);
    };

    // Create a single channel for all MOVION realtime subscriptions
    const channel = supabase
      .channel(`movion-realtime-${user.id}`)
      // Watch History changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watch_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          debouncedInvalidate([['watch-history', user.id]]);
        }
      )
      // Watch Later changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watch_later',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          debouncedInvalidate([['watch-later', user.id], ['is-watch-later']]);
        }
      )
      // Saved Videos changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_videos',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          debouncedInvalidate([['saved-videos', user.id], ['is-saved']]);
        }
      )
      // Playlists changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playlists',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playlists', user.id] });
        }
      )
      // Subscriptions changes - for real-time subscriber counts
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          queryClient.invalidateQueries({ queryKey: ['is-subscribed'] });
          queryClient.invalidateQueries({ queryKey: ['channel'] });
        }
      )
      // Channels changes - for real-time subscriber counts
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
        },
        (payload) => {
          const channelId = payload.new?.id;
          if (channelId) {
            queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
          }
          queryClient.invalidateQueries({ queryKey: ['channel'] });
        }
      )
      // Video likes changes - for real-time like counts
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['video-like'] });
          queryClient.invalidateQueries({ queryKey: ['video'] });
          queryClient.invalidateQueries({ queryKey: ['videos'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};

/**
 * Hook for global video updates (new videos, trending changes, real-time counts)
 */
export const useGlobalVideoRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('movion-global-videos')
      // New video uploads
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['videos'] });
          queryClient.invalidateQueries({ queryKey: ['shorts'] });
        }
      )
      // Video updates (likes, views, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
        },
        (payload) => {
          // Update specific video cache
          const videoId = payload.new?.id;
          if (videoId) {
            queryClient.invalidateQueries({ queryKey: ['video', videoId] });
          }
          queryClient.invalidateQueries({ queryKey: ['videos'] });
        }
      )
      // Channel updates (subscriber counts)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
        },
        (payload) => {
          const channelId = payload.new?.id;
          if (channelId) {
            queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
          }
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
