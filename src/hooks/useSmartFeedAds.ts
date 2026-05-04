import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🤖 AI Smart Ad Engine for Home Feed
 *
 * Strategy rules (from spec):
 *  - First 3 posts: NEVER show ads (clean first impression)
 *  - Fast scroll → reduce ads
 *  - Slow scroll / high engagement → more ads
 *  - Dynamic frequency:
 *      • New user (<48h):  every 6 posts
 *      • Active user:      every 4 posts
 *      • Default:          every 5 posts
 *  - Max 8 ads per session
 *
 * Realtime: scroll speed tracked live via window scroll listener.
 */

const NEW_USER_HOURS = 48;
const FAST_SCROLL_PX_PER_SEC = 1200; // above this = "fast scroller"
const MAX_ADS_PER_SESSION = 8;
const MIN_POSTS_BEFORE_FIRST_AD = 3;

type ScrollSpeed = "slow" | "normal" | "fast";

export function useSmartFeedAds() {
  const { user } = useAuth();
  const [scrollSpeed, setScrollSpeed] = useState<ScrollSpeed>("normal");
  const [frequency, setFrequency] = useState<number>(5);
  const [adsShownThisSession, setAdsShownThisSession] = useState<number>(0);
  const lastScrollY = useRef<number>(0);
  const lastScrollTs = useRef<number>(Date.now());
  const speedSamples = useRef<number[]>([]);

  // Detect new user vs active user → set base frequency
  useEffect(() => {
    if (!user) {
      setFrequency(5);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data?.created_at) {
          const ageHours =
            (Date.now() - new Date(data.created_at).getTime()) / 36e5;
          if (ageHours < NEW_USER_HOURS) {
            setFrequency(6); // new user → fewer ads
          } else {
            setFrequency(4); // active/established → tighter
          }
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Live scroll-speed tracking (throttled via rAF — prevents re-render storm)
  useEffect(() => {
    let ticking = false;
    let lastUpdate = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const now = Date.now();
        const y = window.scrollY;
        const dt = now - lastScrollTs.current;
        const dy = Math.abs(y - lastScrollY.current);
        if (dt > 100) {
          const pxPerSec = (dy / dt) * 1000;
          speedSamples.current.push(pxPerSec);
          if (speedSamples.current.length > 6) speedSamples.current.shift();
          lastScrollY.current = y;
          lastScrollTs.current = now;
          // Only update React state at most every 500ms — avoids cascading feed re-renders on every scroll tick
          if (now - lastUpdate > 500) {
            const avg =
              speedSamples.current.reduce((a, b) => a + b, 0) /
              speedSamples.current.length;
            const next: ScrollSpeed =
              avg > FAST_SCROLL_PX_PER_SEC
                ? "fast"
                : avg < 200
                ? "slow"
                : "normal";
            setScrollSpeed((prev) => (prev === next ? prev : next));
            lastUpdate = now;
          }
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Decide if an ad slot should render after the post at `index` (0-based).
   */
  const shouldShowAd = useCallback(
    (index: number): boolean => {
      // Rule 1: clean first impression
      if (index < MIN_POSTS_BEFORE_FIRST_AD) return false;
      // Rule 2: session cap
      if (adsShownThisSession >= MAX_ADS_PER_SESSION) return false;
      // Rule 3: fast scroll → skip half the ads
      const effectiveFreq =
        scrollSpeed === "fast"
          ? Math.max(frequency + 2, 6) // stretch interval
          : scrollSpeed === "slow"
          ? Math.max(frequency - 1, 3) // tighten interval
          : frequency;
      // index is 0-based; slot triggers when (index + 1) is multiple of freq
      return (index + 1) % effectiveFreq === 0;
    },
    [scrollSpeed, frequency, adsShownThisSession]
  );

  const registerAdShown = useCallback(() => {
    setAdsShownThisSession((c) => c + 1);
  }, []);

  return {
    shouldShowAd,
    registerAdShown,
    scrollSpeed,
    frequency,
    adsShownThisSession,
  };
}
