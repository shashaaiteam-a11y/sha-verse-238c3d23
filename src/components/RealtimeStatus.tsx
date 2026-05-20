import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * REALTIME-FIX: Tiny "Syncing..." banner shown just above the mobile BottomNav
 * whenever the Supabase realtime socket is not connected. Auto-hides when
 * connected, so it adds 0px layout shift in the happy path.
 */
export const RealtimeStatus = () => {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const rt: any = (supabase as any).realtime;
    if (!rt) return;

    const update = () => {
      try {
        setConnected(rt.isConnected ? rt.isConnected() : true);
      } catch {
        setConnected(true);
      }
    };

    update();
    const interval = setInterval(update, 1500);

    const onOnline = () => update();
    const onOffline = () => setConnected(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (connected && navigator.onLine !== false) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 h-5 flex items-center justify-center text-[11px] text-muted-foreground bg-muted/70 backdrop-blur-sm pointer-events-none"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      role="status"
      aria-live="polite"
    >
      Syncing...
    </div>
  );
};

export default RealtimeStatus;
