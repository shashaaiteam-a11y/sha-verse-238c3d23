import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ADS_HIDDEN } from "@/lib/ads/adConfig";
import { isNativeAdsSupported } from "@/lib/ads/native/bridge";
import {
  getSlotState,
  releaseSlot,
  requestSlot,
  subscribeSlot,
  updateSlotBounds,
} from "@/lib/ads/native/manager";
import { installNativeAdAnalytics } from "@/lib/ads/native/analytics";
import { PLACEMENT_HEIGHT, type NativePlacementId } from "@/lib/ads/native/placements";

interface NativeAdSlotProps {
  placement: NativePlacementId;
  /** Stable key so realtime list updates never recycle an ad into a new spot. */
  slotKey: string;
  className?: string;
  /** Overrides the reserved height for this placement. */
  height?: number;
  /** Lets a parent collapse surrounding reserved space after a terminal failure. */
  onStateChange?: (state: "idle" | "loading" | "loaded" | "failed") => void;
}

/**
 * Reserves layout space for a real AdMob Native Advanced ad rendered by the
 * Android SDK on top of this container. Renders nothing at all on web, so web
 * behaviour is untouched, and collapses silently when no ad fills.
 */
const NativeAdSlot = ({ placement, slotKey, className, height, onStateChange }: NativeAdSlotProps) => {
  const supported = isNativeAdsSupported() && !ADS_HIDDEN;
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const slotId = `${placement}:${slotKey}:${uid}`;
  const [state, setState] = useState(() => getSlotState(slotId));

  useEffect(() => {
    if (!supported) return;
    installNativeAdAnalytics();
    const unsubscribe = subscribeSlot(slotId, setState);
    void requestSlot(slotId, placement);
    return () => {
      unsubscribe();
      void releaseSlot(slotId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, slotId, placement]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  // Keep the native view glued to the reserved container while scrolling.
  useEffect(() => {
    if (!supported || state !== "loaded") return;
    let frame = 0;
    let last = "";

    const sync = () => {
      frame = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible =
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.width > 0 &&
        rect.height > 0;
      const signature = `${Math.round(rect.left)}|${Math.round(rect.top)}|${Math.round(rect.width)}|${Math.round(rect.height)}|${visible}`;
      if (signature === last) return;
      last = signature;
      void updateSlotBounds(slotId, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible,
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [supported, state, slotId]);

  if (!supported) return null;
  // No fill / error: collapse completely, never show a fake ad.
  if (state === "failed") return null;

  const reserved = height ?? PLACEMENT_HEIGHT[placement];

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn("w-full overflow-hidden rounded-xl border border-border bg-card", className)}
      style={{ height: reserved }}
    />
  );
};

export default NativeAdSlot;
