/**
 * MOVION watch tracker (isolated to the Movion/video module).
 *
 * - Accumulates ONLY real, active playback time on the client.
 * - Flushes batched progress to the server every 15s and on
 *   pause / end / tab-hide / unmount.
 * - The server (record_watch_progress) decides when a view counts,
 *   deduplicates rapid re-watches and stores watch-time analytics.
 */
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FLUSH_INTERVAL_MS = 15000;
const MAX_TICK_SECONDS = 2; // ignore seeks / jumps

const makeSessionKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

interface Options {
  videoId?: string;
  isShort?: boolean;
  duration?: number;
}

export const useWatchTracker = ({ videoId, isShort = false, duration }: Options) => {
  const sessionKeyRef = useRef<string>(makeSessionKey());
  const pendingRef = useRef(0);
  const positionRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  // New logical session whenever the video changes
  useEffect(() => {
    sessionKeyRef.current = makeSessionKey();
    pendingRef.current = 0;
    positionRef.current = 0;
    lastTimeRef.current = null;
  }, [videoId]);

  const flush = useCallback(async () => {
    if (!videoId) return;
    const delta = Math.round(pendingRef.current);
    if (delta <= 0 || inFlightRef.current) return;

    pendingRef.current -= delta;
    inFlightRef.current = true;
    try {
      await supabase.rpc('record_watch_progress', {
        _video_id: videoId,
        _session_key: sessionKeyRef.current,
        _delta_seconds: delta,
        _position_seconds: Math.round(positionRef.current),
        _duration_seconds: duration && duration > 0 ? Math.round(duration) : null,
        _is_short: isShort,
      });
    } catch {
      // best-effort; time is not re-queued to avoid inflation
    } finally {
      inFlightRef.current = false;
    }
  }, [videoId, duration, isShort]);

  /** Call from the <video> onTimeUpdate handler while playing. */
  const onTimeUpdate = useCallback((currentTime: number) => {
    if (!Number.isFinite(currentTime)) return;
    positionRef.current = Math.max(positionRef.current, currentTime);
    const last = lastTimeRef.current;
    lastTimeRef.current = currentTime;
    if (last === null) return;
    const delta = currentTime - last;
    if (delta > 0 && delta <= MAX_TICK_SECONDS) {
      pendingRef.current += delta;
    }
  }, []);

  /** Call on pause / ended / becoming inactive. */
  const onPause = useCallback(() => {
    lastTimeRef.current = null;
    void flush();
  }, [flush]);

  // Periodic batched flush + lifecycle safety nets
  useEffect(() => {
    if (!videoId) return;
    const interval = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        lastTimeRef.current = null;
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [videoId, flush]);

  return { onTimeUpdate, onPause, flush };
};

export default useWatchTracker;
