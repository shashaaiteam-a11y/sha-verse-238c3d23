import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/ads/nativeAdMob";

interface ShortsScrollAdProps {
  className?: string;
  isActive?: boolean;
}

/**
 * Full-screen vertical Shorts/Pulse ad. TikTok-style: stays in feed,
 * user can swipe past it. Auto-records impression when active.
 */
const ShortsScrollAd = ({ className, isActive = true }: ShortsScrollAdProps) => {
  const { user } = useAuth();
  const { hideAd, registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency("shorts_scroll", category);
  const [recorded, setRecorded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!shouldRender || !isActive || recorded || dismissed) return;
    recordAdImpression(user?.id, "shorts_scroll", adUnitId, category);
    registerImpression(adUnitId);
    setRecorded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, shouldRender]);

  // On native (Android/iOS) real AdMob ads are served by the SDK — never show the web placeholder card.

  if (isNative()) return null;

  if (!shouldRender || dismissed) return null;

  return (
    <div
      className={cn(
        "relative w-full h-full bg-black flex items-center justify-center overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-black to-accent/30" />

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <TestAdBadge variant="overlay" />
        <span className="text-[10px] text-white/80 uppercase tracking-wide">Sponsored</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-20 h-8 w-8 text-white/80 hover:bg-white/10"
        onClick={() => { hideAd(category); setDismissed(true); }}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="relative z-10 text-center text-white px-6 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-primary-foreground">
          S
        </div>
        <h3 className="text-2xl font-bold mb-2">Featured Brand</h3>
        <p className="text-sm text-white/80 mb-6">
          Discover something amazing — tap to learn more.
        </p>
        <Button className="bg-white text-black hover:bg-white/90 gap-2">
          Learn More
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ShortsScrollAd;
