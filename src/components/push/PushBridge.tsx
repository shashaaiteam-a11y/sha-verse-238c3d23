/**
 * PushBridge — mounts once inside AuthProvider.
 *
 *  1. Registers this device for system push once the user is signed in.
 *  2. Routes a tapped push notification to the right screen.
 *  3. Removes the device token on sign-out.
 *
 * Renders nothing and does not touch the in-app notification system.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { registerPush, removeCurrentDeviceToken, isNativePush } from '@/lib/push/registerPush';
import { resolvePushPath } from '@/lib/push/handlePushTap';

export const PushBridge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const registeredFor = useRef<string | null>(null);
  const hadUser = useRef(false);

  // Register / unregister with the signed-in account.
  useEffect(() => {
    if (!user?.id) {
      if (hadUser.current) {
        hadUser.current = false;
        void removeCurrentDeviceToken();
      }
      registeredFor.current = null;
      return;
    }
    hadUser.current = true;
    if (registeredFor.current === user.id) return;

    // Native: register immediately (OS prompt). Web: only if already granted —
    // a fresh permission prompt needs a user gesture, handled in Settings.
    let cancelled = false;
    void (async () => {
      if (!isNativePush()) {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      }
      // Transient failures (no network, FCM hiccup) must not block a retry,
      // so the "already registered" marker is only set after a real success.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        const result = await registerPush();
        if (result.status === 'registered') {
          registeredFor.current = user.id;
          return;
        }
        if (result.status !== 'error') {
          console.info('[push] not registered:', result.status);
          return; // denied / unsupported / not-configured — retrying won't help
        }
        console.info('[push] registration error, will retry:', result.message);
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Native listeners: foreground receipt + tap navigation.
  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;

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
      // Note: the tray is intentionally NOT wiped on app open (Facebook-style).
      // Individual notifications are dismissed by the OS when the user taps them.
      cleanup = () => {
        void received.remove();
        void actioned.remove();
      };
    })();

    return () => cleanup?.();
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
