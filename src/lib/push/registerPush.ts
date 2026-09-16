/**
 * Push registration — isolated layer on top of the existing notification system.
 *
 * Nothing here touches in-app notifications; it only registers this device's
 * FCM address so the backend can also reach the user when the app is closed.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { firebaseVapidKey, firebaseWebConfig, isWebPushConfigured } from './config';

export type PushPlatform = 'android' | 'ios' | 'web';

export type PushRegisterResult =
  | { status: 'registered'; token: string; platform: PushPlatform }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'not-configured' }
  | { status: 'open-in-new-tab' }
  | { status: 'error'; message: string };

const DEVICE_ID_KEY = 'sha_verse_push_device_id';
const FALLBACK_DEVICE_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : FALLBACK_DEVICE_ID;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Never collapse every storage-restricted device into one shared
    // "unknown-device" identifier. Keep a stable id for this app session.
    return FALLBACK_DEVICE_ID;
  }
};

export const isNativePush = (): boolean => Capacitor.isNativePlatform();

/** Upsert the token for the signed-in user and refresh its freshness stamp. */
export const saveToken = async (token: string, platform: PushPlatform): Promise<void> => {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = auth?.user?.id;
  if (!userId) throw new Error('No signed-in user available for push registration');

  const deviceId = getDeviceId();

  // A device's token can rotate — clear the old row for this device first.
  const { error: cleanupError } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .neq('token', token);
  if (cleanupError) throw cleanupError;

  const { error: upsertError } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      device_id: deviceId,
      device_label: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : null,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
  if (upsertError) throw upsertError;
};

/**
 * Detach this device from an account. Call this BEFORE `auth.signOut()` and
 * pass the known user id — after sign-out there is no session left to
 * authorise the delete, so the row would silently survive.
 */
export const removeCurrentDeviceToken = async (knownUserId?: string): Promise<void> => {
  let userId = knownUserId;
  if (!userId) {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    userId = auth?.user?.id;
  }
  if (!userId) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', getDeviceId());
  if (error) throw error;
};

// ------------------------------------------------------------------ native
const registerNative = async (): Promise<PushRegisterResult> => {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return { status: 'denied' };

  const platform: PushPlatform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

  // Android 8+ needs an explicit channel, matching the manifest + FCM payload.
  if (platform === 'android') {
    await PushNotifications.createChannel({
      id: 'sha_verse_alerts_v2',
      name: 'SHA-VERSE Alerts',
      description: 'Likes, comments, messages, friend requests and updates',
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => undefined);
  }

  return await new Promise<PushRegisterResult>((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let registrationHandle: { remove: () => Promise<void> } | undefined;
    let errorHandle: { remove: () => Promise<void> } | undefined;

    const cleanup = async () => {
      if (timeoutId) clearTimeout(timeoutId);
      await Promise.allSettled([
        registrationHandle?.remove(),
        errorHandle?.remove(),
      ].filter(Boolean) as Promise<void>[]);
    };

    const finish = (result: PushRegisterResult) => {
      if (settled) return;
      settled = true;
      void cleanup().finally(() => resolve(result));
    };

    void (async () => {
      registrationHandle = await PushNotifications.addListener('registration', (t) => {
        // Registration is not considered successful until the token is actually
        // persisted in Supabase. This prevents PushBridge from marking a device
        // registered after an RLS/network/upsert failure.
        void saveToken(t.value, platform)
          .then(() => finish({ status: 'registered', token: t.value, platform }))
          .catch((err) => {
            console.error('[push] token save failed', err);
            finish({
              status: 'error',
              message: err instanceof Error ? err.message : String(err),
            });
          });
      });

      errorHandle = await PushNotifications.addListener('registrationError', (err) => {
        finish({ status: 'error', message: String(err?.error ?? 'registration failed') });
      });

      timeoutId = setTimeout(() => {
        finish({ status: 'error', message: 'registration timed out' });
      }, 15000);

      await PushNotifications.register();
    })().catch((err) => {
      finish({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    });
  });
};

// --------------------------------------------------------------------- web
const registerWeb = async (): Promise<PushRegisterResult> => {
  if (!isWebPushConfigured()) return { status: 'not-configured' };
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { status: 'unsupported' };
  }
  // Permission prompts are rejected inside cross-origin preview iframes.
  if (window.top !== window.self) return { status: 'open-in-new-tab' };

  const { initializeApp, getApps } = await import('firebase/app');
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return { status: 'unsupported' };

  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' };

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseWebConfig);
  const query = new URLSearchParams(firebaseWebConfig as Record<string, string>).toString();
  const swReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const token = await getToken(getMessaging(app), {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return { status: 'denied' };

  await saveToken(token, 'web');
  return { status: 'registered', token, platform: 'web' };
};

/**
 * Register this device for push. Safe to call repeatedly — it refreshes the
 * stored token and its last_seen_at stamp on every successful registration.
 */
export const registerPush = async (): Promise<PushRegisterResult> => {
  try {
    return isNativePush() ? await registerNative() : await registerWeb();
  } catch (err) {
    console.error('[push] register failed', err);
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
};

/** Current OS/browser permission state, without prompting. */
export const getPushPermissionState = async (): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> => {
  try {
    if (isNativePush()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const p = await PushNotifications.checkPermissions();
      if (p.receive === 'granted') return 'granted';
      if (p.receive === 'denied') return 'denied';
      return 'prompt';
    }
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
};
