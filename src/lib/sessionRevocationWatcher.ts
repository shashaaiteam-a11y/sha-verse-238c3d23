/**
 * Watches for remote session revocation and account deactivation.
 * If THIS device's session row is deleted from `user_sessions`, OR
 * the user's profile is flipped to `is_deactivated = true`, we immediately
 * sign out and bounce to /auth so the spec
 * "Deactivate per click → all devices instantly logged out, access paused until re-login"
 * actually holds end-to-end.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDeviceToken, clearDeviceToken } from '@/lib/sessionTracker';

let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let activeUserId: string | null = null;

async function forceSignOut(reason: string) {
  try {
    console.warn('[sessionRevocation] forcing sign out:', reason);
    clearDeviceToken();
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[sessionRevocation] signOut failed', e);
  } finally {
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
  }
}

export function startSessionRevocationWatcher(userId: string) {
  if (activeUserId === userId && activeChannel) return;
  stopSessionRevocationWatcher();

  activeUserId = userId;
  const localToken = getCurrentDeviceToken();

  const channel = supabase
    .channel(`session-revocation-${userId}-${Date.now()}`)
    // 1) Our own user_sessions row got deleted → another device kicked us
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'user_sessions',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        const deletedToken = payload?.old?.session_token;
        // If the deleted row belongs to THIS device, sign out immediately.
        // (Deactivation deletes ALL rows, so this also catches that case.)
        if (!deletedToken || deletedToken === localToken) {
          forceSignOut('session row deleted');
        }
      }
    )
    // 2) Profile flipped to deactivated → pause access on every device
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload: any) => {
        if (payload?.new?.is_deactivated === true) {
          forceSignOut('account deactivated');
        }
      }
    )
    .subscribe();

  activeChannel = channel;
}

export function stopSessionRevocationWatcher() {
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }
  activeUserId = null;
}
