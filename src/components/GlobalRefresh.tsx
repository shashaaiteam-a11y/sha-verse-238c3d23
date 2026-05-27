import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * GlobalRefresh
 * - Adds Facebook/Twitter-style pull-to-refresh on every page (mobile).
 *   Indicator floats just above the mobile bottom navigation.
 * - Forces a one-time fresh reload on user SIGN_IN.
 * - Reloads when the app is reopened after being backgrounded for >60s
 *   (mimics Facebook "fresh content on reopen").
 *
 * Strictly additive: does not modify any module, feature, or layout.
 */

// Routes where pull-to-refresh must NOT engage (match BottomNav hide rules + reader)
const EXCLUDED_PATH_PREFIXES = [
  "/auth",
  "/messages",
  "/bookshelf/read/",
  "/movion", // Movion has its own scrolling shorts player
];
const EXCLUDED_PATH_CONTAINS = ["/watch/"];

const THRESHOLD = 80;
const RESISTANCE = 2.5;
const BACKGROUND_RELOAD_MS = 60_000;

const isExcluded = (path: string) => {
  if (EXCLUDED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path === p)) return true;
  if (EXCLUDED_PATH_PREFIXES.includes(path)) return true;
  if (EXCLUDED_PATH_CONTAINS.some((p) => path.includes(p))) return true;
  return false;
};

export const GlobalRefresh = () => {
  const location = useLocation();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const excluded = isExcluded(location.pathname);

  const doReload = useCallback(() => {
    setIsRefreshing(true);
    // Small delay so the indicator is visible before the hard reload
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        /* noop */
      }
    }, 150);
  }, []);

  // ===== Pull-to-refresh (touch) =====
  useEffect(() => {
    if (excluded) return;

    const onTouchStart = (e: TouchEvent) => {
      const sy = window.scrollY || document.documentElement.scrollTop || 0;
      if (sy <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const dy = (e.touches[0].clientY - startY.current) / RESISTANCE;
      if (dy > 0) {
        // Only preventDefault when we're actually pulling — avoid breaking horizontal swipes
        if (dy > 5 && e.cancelable) e.preventDefault();
        setPullDistance(Math.min(dy, THRESHOLD * 1.5));
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD && !isRefreshing) {
        doReload();
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove as any);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [excluded, isRefreshing, pullDistance, doReload]);

  // ===== Reload on SIGN_IN (Facebook-style fresh app on login) =====
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const KEY = "__sv_signin_reload__";
        // Avoid infinite loop — only reload once per fresh sign-in
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          // Let auth state settle before reloading
          setTimeout(() => window.location.reload(), 250);
        }
      }
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("__sv_signin_reload__");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ===== Reload on reopen after long background (app closed/minimized) =====
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (document.visibilityState === "visible" && hiddenAt) {
        const gap = Date.now() - hiddenAt;
        hiddenAt = 0;
        if (gap >= BACKGROUND_RELOAD_MS) {
          window.location.reload();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (excluded) return null;

  const show = pullDistance > 10 || isRefreshing;
  const triggered = pullDistance >= THRESHOLD;

  return (
    <div
      aria-hidden={!show}
      className="fixed left-1/2 -translate-x-1/2 z-[60] pointer-events-none md:hidden transition-opacity"
      style={{
        // Float just above the mobile bottom navigation (h-14 = 56px) + safe area
        bottom: "calc(56px + env(safe-area-inset-bottom) + 10px)",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 border border-border shadow-lg backdrop-blur-md text-xs font-medium ${
          triggered ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {isRefreshing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Refreshing…</span>
          </>
        ) : (
          <>
            <ArrowDown
              className={`w-4 h-4 transition-transform ${triggered ? "rotate-180" : ""}`}
            />
            <span>{triggered ? "Release to refresh" : "Pull to refresh"}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalRefresh;
