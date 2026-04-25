/**
 * Session tracker - registers the current device session with the backend
 * so it shows up in the user's "Active Sessions" list and can be remotely revoked.
 */
import { supabase } from '@/integrations/supabase/client';

const SESSION_TOKEN_KEY = 'sha_verse_device_token';

function getOrCreateDeviceToken(): string {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  return 'Browser';
}

function detectOS(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) return 'macOS';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown OS';
}

function detectDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android Phone';
  if (/Android/.test(ua)) return 'Android Tablet';
  if (/Mobile/.test(ua)) return 'Mobile Device';
  return 'Desktop';
}

export async function registerCurrentSession(): Promise<void> {
  try {
    const ua = navigator.userAgent;
    const token = getOrCreateDeviceToken();
    await supabase.rpc('upsert_current_session', {
      p_session_token: token,
      p_browser: detectBrowser(ua),
      p_os: detectOS(ua),
      p_device_info: detectDevice(ua),
      p_user_agent: ua.slice(0, 500),
    });

    // Reactivate account if previously deactivated (logging in reactivates)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_deactivated: false, deactivated_at: null } as any)
        .eq('id', user.id)
        .eq('is_deactivated', true);
    }
  } catch (err) {
    console.warn('[sessionTracker] Failed to register session:', err);
  }
}

export function getCurrentDeviceToken(): string {
  return getOrCreateDeviceToken();
}

export function clearDeviceToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}
