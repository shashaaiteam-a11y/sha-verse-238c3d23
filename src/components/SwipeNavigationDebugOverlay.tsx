import { useEffect, useState } from "react";
import type { SwipeDebugState } from "@/lib/swipeNavigationLock";
import { isSwipeDebugEnabled } from "@/lib/swipeNavigationLock";

export const SwipeNavigationDebugOverlay = () => {
  const [debug, setDebug] = useState<SwipeDebugState | null>(null);
  const [enabled] = useState(() => isSwipeDebugEnabled());

  useEffect(() => {
    if (!enabled) return;

    const handleDebug = (event: Event) => {
      setDebug((event as CustomEvent<SwipeDebugState>).detail);
    };

    window.addEventListener("swipe-navigation-debug", handleDebug);
    return () => window.removeEventListener("swipe-navigation-debug", handleDebug);
  }, [enabled]);

  if (!enabled || !debug) return null;

  return (
    <div className="fixed left-2 bottom-20 z-[100] max-w-[calc(100vw-1rem)] rounded-md border bg-card px-3 py-2 text-[11px] text-card-foreground shadow-lg pointer-events-none">
      <div className="font-semibold">Swipe: {debug.status}</div>
      <div>Reason: {debug.reason ?? "-"}</div>
      <div>dx/dy: {Math.round(debug.dx ?? 0)} / {Math.round(debug.dy ?? 0)}</div>
      <div className="max-w-[280px] truncate">Target: {debug.target ?? "unknown"}</div>
    </div>
  );
};