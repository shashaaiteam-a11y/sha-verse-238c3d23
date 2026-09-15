import { useCallback, useEffect, useMemo } from 'react';
import { sendWatchReport } from './watchOutbox';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleVisible } from '@/lib/navigation/moduleVisibility';
import { PlaybackSample, WatchSession } from './watchSession';

interface Options { videoId?: string; isShort?: boolean; duration?: number; enabled?: boolean }

export const useWatchTracker = ({ videoId, enabled = true }: Options) => {
  const { user } = useAuth();
  const visible = useModuleVisible();
  // In-flight requests retain their original video and account across navigation.
  const session = useMemo(() => videoId && user?.id ? new WatchSession(videoId, user.id) : null, [videoId, user?.id]);

  const flush = useCallback(async () => {
    if (!session || ((!enabled || !visible) && session.seconds === 0)) return;
    try {
      await session.flush((total, position, content) => sendWatchReport({
        userId: session.userId, videoId: session.videoId, sessionKey: session.key, total, position, content,
      }));
    } catch {
      // The persisted outbox retries after navigation, reconnect and reload.
    }
  }, [session, enabled, visible]);

  const onTimeUpdate = useCallback((media: PlaybackSample) => {
    session?.sample(media, enabled && visible && document.visibilityState === 'visible');
  }, [session, visible, enabled]);

  const onPause = useCallback(() => { session?.reset(); void flush(); }, [session, flush]);

  useEffect(() => { if (!visible || !enabled) onPause(); }, [visible, enabled, onPause]);

  useEffect(() => {
    if (!session || !visible || !enabled) return;
    void flush(); // Establish server time before accumulating playback.
    const timer = setInterval(() => void flush(), 5000);
    const onVisibility = () => { session.reset(); void flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPause);
    window.addEventListener('online', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPause);
      window.removeEventListener('online', onVisibility);
      onPause();
    };
  }, [session, visible, enabled, flush, onPause]);

  return { onTimeUpdate, onPause, flush };
};

export default useWatchTracker;
