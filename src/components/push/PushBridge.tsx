/**
 * PushBridge — mounts once inside AuthProvider.
 *
 *  1. Registers this device for system push once the user is signed in.
 *  2. Routes a tapped push notification to the right screen.
 *  3. Retries transient registration failures when connectivity/app state recovers.
 *
 * Renders nothing and does not touch the in-app notification system.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { registerPush, isNativePush } from '@/lib/push/registerPush';
import { resolvePushPath } from '@/lib/push/handlePushTap';

export const PushBridge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const registeredFor = useRef<string | null>(null);

  // Register the signed-in account. AuthContext explicitly detaches the current
  // device token BEFORE signOut while the authenticated session still exists.
  useEffect(() => {
    if (!user?.id) {
      registeredFor.current = null;
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const tryRegister = async () => {
      if (cancelled || inFlight || registeredFor.current === user.id) return;

      // Web permission prompts need a user gesture. Automatic registration is
      // only attempted when permission was already granted. Native may request
      // permission through the Capacitor plugin.
      if (!isNativePush()) {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      }

      inFlight = true;
      clearRetry();

      try {
        const result = await registerPush();
        if (cancelled) return;

        if (result.status === 'registered') {
          registeredFor.current = user.id;
          return;
        }

        if (result.status === 'error') {
          console.info('[push] registration error, will retry:', result.message);
          // Keep a bounded delayed retry, while online/visibility events below
          // provide additional recovery after longer outages or app resume.
          retryTimer = setTimeout(() => {
            void tryRegister();
          }, 5000);
          return;
        }

        console.info('[push] not registered:', result.status);
      } finally {
        inFlight = false;
      }
    };

    const onOnline = () => {
      void tryRegister();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void tryRegister();
    };

    void tryRegister();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearRetry();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id]);

  // Native listeners: foreground receipt + tap navigation.
  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;

    void (async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const received = await PushNotifications.addListener('pushNotificationReceived', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      });
      const actioned = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          navigate(resolvePushPath(action.notification?.data as Record<string, unknown>));
        },
      );

      // If this effect was disposed while the async listeners were being added,
      // remove them immediately instead of leaking duplicate handlers.
      if (disposed) {
        await Promise.allSettled([received.remove(), actioned.remove()]);
        return;
      }

      // The tray is intentionally NOT wiped on app open (Facebook-style).
      // Individual notifications are dismissed by the OS when the user taps them.
      cleanup = () => {
        void received.remove();
        void actioned.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [user?.id, navigate, queryClient]);

  // Web: foreground message + click-through from the service worker.
  useEffect(() => {
    if (!user?.id || Capacitor.isNativePlatform()) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-navigate' && typeof event.data.path === 'string') {
        navigate(resolvePushPath({ path: event.data.path }));
      }
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [user?.id, navigate, queryClient]);

  return null;
};
