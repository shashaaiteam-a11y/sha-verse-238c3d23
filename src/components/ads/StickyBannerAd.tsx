import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import type { AdPlacement } from "@/lib/ads/adTypes";
import { cn } from "@/lib/utils";

interface StickyBannerAdProps {
  placement: AdPlacement;
  className?: string;
}

/**
 * Slim sticky banner — perfect above the reader pagination bar.
 * Always dismissible, always low-profile.
 */
const StickyBannerAd = ({ placement, className }: StickyBannerAdProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency(placement, category);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!shouldRender || closed) return;
    recordAdImpression(user?.id, placement, adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 📱 Native (Android/iOS): show the REAL AdMob adaptive banner overlay.
  useEffect(() => {
    if (!isNative() || !shouldRender || closed || !adUnitId) return;
    showBanner(adUnitId);
    return () => {
      releaseBanner();
    };
  }, [shouldRender, closed, adUnitId]);

  if (!shouldRender || closed) return null;

  // On native the AdMob SDK draws the banner itself — no DOM placeholder.
  if (isNative()) return null;


  return (
    <div
      className={cn(
        "w-full bg-card border-t border-border px-3 py-2 flex items-center justify-between gap-2",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <TestAdBadge variant="small" />
        <p className="text-xs text-foreground truncate">
          <span className="font-medium">Sponsored:</span> Discover new tools to boost your reading
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground flex-shrink-0"
        onClick={() => setClosed(true)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default StickyBannerAd;
