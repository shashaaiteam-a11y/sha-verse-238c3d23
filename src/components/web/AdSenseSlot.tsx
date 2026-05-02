import { useEffect, useRef } from "react";
import { ADSENSE_PUBLISHER_ID, ADSENSE_SLOTS, isAdSenseEligible } from "@/lib/ads/adsenseConfig";

interface AdSenseSlotProps {
  slot: keyof typeof ADSENSE_SLOTS;
  format?: "auto" | "fluid" | "rectangle";
  layout?: string;
  className?: string;
  /** Stretch to container width (default true). */
  responsive?: boolean;
}

/**
 * Renders a single AdSense ad unit.
 * Renders NOTHING on preview/localhost/native — safe by default.
 */
export const AdSenseSlot = ({
  slot,
  format = "auto",
  layout,
  className,
  responsive = true,
}: AdSenseSlotProps) => {
  const ref = useRef<HTMLModElement | null>(null);
  const slotId = ADSENSE_SLOTS[slot];

  useEffect(() => {
    if (!isAdSenseEligible() || !slotId) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // swallow — usually "already pushed" on fast remounts
    }
  }, [slotId]);

  if (!isAdSenseEligible() || !slotId) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-ad-layout={layout}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
};
