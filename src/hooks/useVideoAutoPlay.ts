import { useEffect } from "react";

/**
 * useVideoAutoPlay — Facebook/Instagram-style scroll auto-play for inline <video>.
 *
 * Behaviour (purely additive, no UI changes):
 *  - Auto-plays MUTED when the element is >= 60% visible in the viewport.
 *  - Pauses when the element is < 30% visible (kept at current frame, no reset).
 *  - Only ONE registered video plays at a time (singleton manager).
 *  - If the user manually pauses (direct interaction), it is NOT auto-resumed
 *    until they play it again or it leaves and re-enters the viewport.
 *  - Pauses everything when the browser tab is hidden / app backgrounded.
 *
 * It deliberately does NOT mute a video the user has "engaged" with
 * (data-engaged="true"), so the existing tap-to-play-with-sound flow is intact.
 */

type Entry = { userPaused: boolean; lastInteraction: number };

// Module-level singleton registry shared by every VideoThumb instance.
const registry = new Map<HTMLVideoElement, Entry>();

const supportsIdle =
  typeof window !== "undefined" && "requestIdleCallback" in window;

function pauseOthers(except: HTMLVideoElement) {
  registry.forEach((_, v) => {
    if (v !== except && !v.paused) {
      try {
        v.pause();
      } catch {
        /* noop */
      }
    }
  });
}

export function useVideoAutoPlay(
  ref: React.RefObject<HTMLVideoElement>,
  opts: { autoPlay?: boolean } = {}
) {
  const { autoPlay = true } = opts;

  useEffect(() => {
    if (!autoPlay) return;
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const entry: Entry = { userPaused: false, lastInteraction: 0 };
    registry.set(video, entry);

    // Track direct user interactions so we can tell a *user* pause apart from
    // a programmatic pause (scroll-out / singleton enforcement / tab hide).
    const markInteraction = () => {
      entry.lastInteraction = Date.now();
    };
    video.addEventListener("pointerdown", markInteraction, true);

    const onPause = () => {
      // Only remember as a user pause if it followed a recent direct tap/click.
      if (Date.now() - entry.lastInteraction < 500) {
        entry.userPaused = true;
      }
    };
    const onPlay = () => {
      entry.userPaused = false;
      pauseOthers(video); // singleton: only one video plays at a time
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    const tryPlay = () => {
      if (entry.userPaused || document.hidden) return;
      // Skip live MediaStream videos (e.g. WebRTC calls).
      // @ts-ignore - srcObject not in older lib types
      if (video.srcObject) return;
      // Keep sound for a video the user explicitly engaged with.
      if (video.dataset.engaged !== "true") video.muted = true;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) {
            tryPlay();
          } else if (e.intersectionRatio < 0.3) {
            if (!video.paused) {
              try {
                video.pause();
              } catch {
                /* noop */
              }
            }
          }
        }
      },
      { threshold: [0.3, 0.6, 0.9], rootMargin: "0px 0px -10% 0px" }
    );

    // Defer observer registration to idle time to avoid jank during fast scroll.
    let idleId: number | undefined;
    const register = () => io.observe(video);
    if (supportsIdle) {
      // @ts-ignore
      idleId = window.requestIdleCallback(register);
    } else {
      register();
    }

    const onVisibility = () => {
      if (document.hidden && !video.paused) {
        try {
          video.pause();
        } catch {
          /* noop */
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      // @ts-ignore
      if (idleId !== undefined && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idleId);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("pointerdown", markInteraction, true);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      registry.delete(video);
    };
  }, [ref, autoPlay]);
}

export default useVideoAutoPlay;
