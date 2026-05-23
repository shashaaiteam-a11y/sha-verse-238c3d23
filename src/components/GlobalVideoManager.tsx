import { useEffect } from "react";

/**
 * GlobalVideoManager
 * - Ensures only ONE <video> plays at a time (Facebook-like).
 * - Auto-pauses any <video> that scrolls out of the viewport (<50% visible).
 *
 * Safe-by-default: skips live MediaStream videos (WebRTC calls) and any
 * element explicitly opted-out via `data-ignore-global-pause="true"`.
 * Purely non-invasive — does not touch any existing component.
 */
export const GlobalVideoManager = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldSkip = (v: HTMLVideoElement) => {
      if (v.dataset.ignoreGlobalPause === "true") return true;
      // Skip live streams (video calls)
      // @ts-ignore
      if (v.srcObject) return true;
      return false;
    };

    // 1) Singleton play — pause all other videos when one starts playing
    const onPlay = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!(target instanceof HTMLVideoElement)) return;
      if (shouldSkip(target)) return;
      const videos = document.querySelectorAll("video");
      videos.forEach((v) => {
        if (v === target) return;
        if (shouldSkip(v as HTMLVideoElement)) return;
        if (!v.paused) {
          try { v.pause(); } catch {}
        }
      });
    };
    document.addEventListener("play", onPlay, true);

    // 2) Auto-pause on scroll out of viewport
    const observed = new WeakSet<HTMLVideoElement>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target as HTMLVideoElement;
          if (shouldSkip(v)) return;
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
            if (!v.paused) {
              try { v.pause(); } catch {}
            }
          }
        });
      },
      { threshold: [0, 0.5, 1] }
    );

    const observeVideo = (v: HTMLVideoElement) => {
      if (observed.has(v)) return;
      observed.add(v);
      io.observe(v);
    };

    // Observe all existing videos
    document.querySelectorAll("video").forEach((v) => observeVideo(v as HTMLVideoElement));

    // Watch DOM for new <video> elements
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLVideoElement) {
            observeVideo(n);
          } else if (n instanceof HTMLElement) {
            n.querySelectorAll?.("video").forEach((v) =>
              observeVideo(v as HTMLVideoElement)
            );
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("play", onPlay, true);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
};

export default GlobalVideoManager;
