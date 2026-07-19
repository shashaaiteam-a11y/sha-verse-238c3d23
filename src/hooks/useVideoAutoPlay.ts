import { useEffect } from "react";
import {
  getAudioPreference,
  subscribeAudioPreference,
  fadeVolume,
} from "@/lib/media/audioPreference";

/**
 * useVideoAutoPlay — Facebook/Instagram-style scroll auto-play for inline <video>.
 *
 * Behaviour (purely additive, no UI changes):
 *  - Auto-plays when the element is >= 60% visible in the viewport.
 *  - Pauses when the element is < 40% visible (kept at current frame, no reset).
 *  - Only ONE registered video plays at a time (singleton manager).
 *  - Audio follows the global sound-on preference (default OFF). Volume is
 *    faded in/out over ~250ms to avoid audio popping.
 *  - If the user manually pauses (direct interaction), it is NOT auto-resumed
 *    until they play it again or it leaves and re-enters the viewport.
 *  - Pauses everything when the browser tab is hidden / app backgrounded.
 *  - Resumes from the last currentTime (no reset on scroll-in).
 */

type Entry = {
  userPaused: boolean;
  lastInteraction: number;
  unsubPref?: () => void;
};

// Module-level singleton registry shared by every VideoThumb instance.
const registry = new Map<HTMLVideoElement, Entry>();

const supportsIdle =
  typeof window !== "undefined" && "requestIdleCallback" in window;

function isEngaged(v: HTMLVideoElement) {
  return v.dataset.engaged === "true";
}

function applyAudioTo(video: HTMLVideoElement, soundOn: boolean) {
  // Videos the user explicitly engaged with keep their own audio state.
  if (isEngaged(video)) return;
  if (soundOn) {
    video.muted = false;
    fadeVolume(video, 0, 1, 250);
  } else {
    fadeVolume(video, video.volume ?? 1, 0, 150, () => {
      video.muted = true;
    });
  }
}

function pauseOthers(except: HTMLVideoElement) {
  registry.forEach((_, v) => {
    if (v !== except && !v.paused) {
      // Fade out audio before pausing to prevent pops.
      const wasMuted = v.muted;
      fadeVolume(v, v.volume ?? 1, 0, 120, () => {
        try { v.pause(); } catch { /* noop */ }
        // Restore expected muted state so next play respects preference.
        v.muted = wasMuted;
      });
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
      if (Date.now() - entry.lastInteraction < 500) {
        entry.userPaused = true;
      }
    };
    const onPlay = () => {
      entry.userPaused = false;
      pauseOthers(video); // singleton: only one video plays at a time
      applyAudioTo(video, getAudioPreference());
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    // React to global sound-preference changes while this video is playing.
    entry.unsubPref = subscribeAudioPreference((soundOn) => {
      if (!video.paused) applyAudioTo(video, soundOn);
    });

    const tryPlay = () => {
      if (entry.userPaused || document.hidden) return;
      // Skip live MediaStream videos (e.g. WebRTC calls).
      // @ts-ignore - srcObject not in older lib types
      if (video.srcObject) return;
      const soundOn = getAudioPreference();
      if (!isEngaged(video)) {
        // Muted autoplay is always allowed; unmuted requires an engaged origin,
        // but the user's persisted preference counts as intent — start muted
        // and immediately unmute+fade if allowed.
        video.muted = !soundOn ? true : video.muted;
      }
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => applyAudioTo(video, soundOn)).catch(() => {
          // Autoplay with sound was blocked — fall back to muted.
          try {
            video.muted = true;
            video.play().catch(() => {});
          } catch { /* noop */ }
        });
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) {
            tryPlay();
          } else if (e.intersectionRatio < 0.4) {
            if (!video.paused) {
              try { video.pause(); } catch { /* noop */ }
            }
          }
        }
      },
      { threshold: [0.4, 0.6, 0.9], rootMargin: "0px 0px -10% 0px" }
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
        try { video.pause(); } catch { /* noop */ }
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
      entry.unsubPref?.();
      registry.delete(video);
    };
  }, [ref, autoPlay]);
}

export default useVideoAutoPlay;
