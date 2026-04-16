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

interface BannerAdProps {
  placement: AdPlacement;
  className?: string;
  /** When true, the banner can be closed by the user (still recorded as impression). */
  dismissible?: boolean;
}

const BannerAd = ({ placement, className, dismissible = true }: BannerAdProps) => {
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

  if (!shouldRender || closed) return null;

  return (
    <div
      className={cn(
        "w-full max-w-[320px] mx-auto h-[100px] rounded-lg border border-border bg-card",
        "flex items-center justify-between px-3 relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
          S
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TestAdBadge variant="small" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">Featured Brand</p>
          <p className="text-xs text-muted-foreground truncate">Tap to learn more</p>
        </div>
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 absolute top-1 right-1 text-muted-foreground"
          onClick={() => setClosed(true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default BannerAd;
