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

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
};

export const isNativePush = (): boolean => Capacitor.isNativePlatform();

/** Upsert the token for the signed-in user and refresh its freshness stamp. */
export const saveToken = async (token: string, platform: PushPlatform): Promise<void> => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;

  const deviceId = getDeviceId();
  const tokenSuffix = token.slice(-8); // Only log last 8 chars for security

  console.log('[push] saveToken - platform:', platform, 'token suffix:', tokenSuffix);

  // A device's token can rotate — clear the old row for this device first.
  const deleteResult = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .neq('token', token);

  if (deleteResult.error) {
    console.error('[push] saveToken - delete error:', deleteResult.error);
  }

  const upsertResult = await supabase.from('push_tokens').upsert(
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

  if (upsertResult.error) {
    console.error('[push] saveToken - upsert error:', upsertResult.error);
  } else {
    console.log('[push] saveToken - upsert success for platform:', platform);
  }
};

/** Detach this device from the current account (called on logout). */
export const removeCurrentDeviceToken = async (): Promise<void> => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return;
  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('device_id', getDeviceId());
};

/** Query and log push_tokens for the current user for debugging */
export const debugPushTokens = async (): Promise<void> => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) {
    console.log('[push] debugPushTokens - no user logged in');
    return;
  }

  const deviceId = getDeviceId();
  console.log('[push] debugPushTokens - user_id:', userId, 'device_id:', deviceId);

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) {
    console.error('[push] debugPushTokens - query error:', error);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('[push] debugPushTokens - NO TOKENS FOUND for this device');
    return;
  }

  console.log('[push] debugPushTokens - found', tokens.length, 'token(s) for this device');
  tokens.forEach((token, index) => {
    const tokenSuffix = token.token.slice(-8); // Only log last 8 chars for security
    console.log(`[push] debugPushTokens - token ${index + 1}:`, {
      platform: token.platform,
      enabled: token.enabled,
      token_suffix: tokenSuffix,
      last_seen_at: token.last_seen_at,
      created_at: token.created_at,
      device_label: token.device_label,
    });
  });
};

// ------------------------------------------------------------------ native
const registerNative = async (
  onToken: (token: string, platform: PushPlatform) => void,
): Promise<PushRegisterResult> => {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return { status: 'denied' };

  const platform: PushPlatform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

  // Android 8+ needs an explicit channel, matching the manifest default.
  if (platform === 'android') {
    await PushNotifications.createChannel({
      id: 'sha_verse_default',
      name: 'SHA-VERSE',
      description: 'Likes, comments, messages, friend requests and updates',
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => undefined);
  }

  return await new Promise<PushRegisterResult>((resolve) => {
    let settled = false;
    PushNotifications.addListener('registration', (t) => {
      const tokenSuffix = t.value.slice(-8); // Only log last 8 chars for security
      console.log('[push] registration success - platform:', platform, 'token suffix:', tokenSuffix);
      onToken(t.value, platform);
      if (!settled) {
        settled = true;
        resolve({ status: 'registered', token: t.value, platform });
      }
    });
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err);
      if (!settled) {
        settled = true;
        resolve({ status: 'error', message: String(err?.error ?? 'registration failed') });
      }
    });
    console.log('[push] calling PushNotifications.register() for platform:', platform);
    PushNotifications.register();
    setTimeout(() => {
      if (!settled) {
        console.error('[push] registration timed out for platform:', platform);
        settled = true;
        resolve({ status: 'error', message: 'registration timed out' });
      }
    }, 15000);
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
  return { status: 'registered', token, platform: 'web' };
};

/**
 * Register this device for push. Safe to call repeatedly — it refreshes the
 * stored token and its last_seen_at stamp on every app start.
 */
export const registerPush = async (): Promise<PushRegisterResult> => {
  try {
    const platform = isNativePush() ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android') : 'web';
    console.log('[push] registerPush called - platform:', platform, 'isNativePush:', isNativePush());

    if (isNativePush()) {
      return await registerNative((token, platform) => {
        void saveToken(token, platform);
      });
    }
    const result = await registerWeb();
    if (result.status === 'registered') await saveToken(result.token, 'web');
    return result;
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
