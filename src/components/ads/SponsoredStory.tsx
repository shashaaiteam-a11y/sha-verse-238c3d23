import { useEffect, useState } from "react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

interface SponsoredStoryProps {
  className?: string;
}

/**
 * Story-bar sized sponsored ad (5 sec, skippable visual).
 * Drop-in for FacebookStoriesBar at slot 1 or 2.
 */
const SponsoredStory = ({ className }: SponsoredStoryProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency("home_story", category);

  useEffect(() => {
    if (!shouldRender) return;
    recordAdImpression(user?.id, "home_story", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender) return null;

  return (
    <button
      className={cn(
        "relative flex-shrink-0 w-[100px] sm:w-[110px] h-[160px] sm:h-[170px]",
        "rounded-xl overflow-hidden border border-border bg-card",
        "group cursor-pointer",
        className
      )}
      aria-label="Sponsored story"
    >
      {/* Gradient bg as placeholder visual */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />

      {/* Top badge */}
      <div className="absolute top-2 left-2 z-10">
        <TestAdBadge variant="small" />
      </div>

      {/* Brand circle */}
      <div className="absolute top-9 left-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-card">
        S
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-[10px] text-white/80 mb-0.5">Sponsored</p>
        <p className="text-xs font-semibold text-white truncate">Featured Brand</p>
      </div>
    </button>
  );
};

export default SponsoredStory;
