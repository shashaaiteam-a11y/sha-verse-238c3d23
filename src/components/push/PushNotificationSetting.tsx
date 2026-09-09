/**
 * Settings row: enable/disable system (phone) push notifications.
 * Independent of the in-app notification list.
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  registerPush,
  removeCurrentDeviceToken,
  getPushPermissionState,
  isNativePush,
} from '@/lib/push/registerPush';

export const PushNotificationSetting = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      setPermission(await getPushPermissionState());
      const [{ data: settings }, { count }] = await Promise.all([
        supabase.from('user_settings').select('push_enabled').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('push_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('enabled', true),
      ]);
      const prefOn = settings?.push_enabled !== false;
      setEnabled(prefOn && (count ?? 0) > 0);
    })();
  }, [user?.id]);

  const handleToggle = async (next: boolean) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      if (next) {
        const result = await registerPush();
        if (result.status !== 'registered') {
          const message =
            result.status === 'denied'
              ? 'Notifications are blocked. Allow them in your phone/browser settings.'
              : result.status === 'open-in-new-tab'
                ? 'Open the app in its own tab to allow notifications.'
                : result.status === 'not-configured'
                  ? 'Push is not set up for the web version yet.'
                  : 'Notifications are not supported on this device.';
          toast({ title: 'Could not enable notifications', description: message, variant: 'destructive' });
          setPermission(await getPushPermissionState());
          return;
        }
        await supabase
          .from('user_settings')
          .upsert({ user_id: user.id, push_enabled: true }, { onConflict: 'user_id' });
        setEnabled(true);
        setPermission('granted');
        toast({ title: 'Notifications on', description: 'You will get alerts even when the app is closed.' });
      } else {
        await supabase
          .from('user_settings')
          .upsert({ user_id: user.id, push_enabled: false }, { onConflict: 'user_id' });
        await removeCurrentDeviceToken();
        setEnabled(false);
        toast({ title: 'Notifications off', description: 'You will only see them inside the app.' });
      }
    } catch (err) {
      console.error('[push] toggle failed', err);
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (!user?.id) return null;

  const description = enabled
    ? 'Alerts arrive even when the app is closed'
    : permission === 'denied'
      ? 'Blocked — allow notifications in your device settings'
      : isNativePush()
        ? 'Get alerts on your phone when the app is closed'
        : 'Get alerts in this browser when the app is closed';

  return (
    <Card className="mt-6">
      <div className="flex items-center p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-sm">Push Notifications</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} disabled={busy} onCheckedChange={handleToggle} />
      </div>
    </Card>
  );
};
