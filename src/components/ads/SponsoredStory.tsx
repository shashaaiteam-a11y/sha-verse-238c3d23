import { useEffect, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression, recordAdClick } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

interface SponsoredStoryProps {
  className?: string;
  brandName?: string;
  brandInitial?: string;
  onClick?: () => void;
}

/**
 * Pixel-perfect match of a real story tile in the rail:
 *  - 64x64 avatar with blue ring (matches unviewed story)
 *  - caption row below = brand name (truncated)
 *  - small "Sponsored" badge top-right
 *  - 3-dot hide menu
 */
const SponsoredStory = ({
  className,
  brandName = "Sponsored",
  brandInitial = "S",
  onClick,
}: SponsoredStoryProps) => {
  const { user } = useAuth();
  const { registerImpression, hideAd } = useAds();
  const { category } = useAdTargeting();
  // Force render in test mode (matches NativeAdCard/BannerAd behavior) so the
  // discovery rail position injection always shows the sponsored tile.
  const { shouldRender, adUnitId } = useAdFrequency("home_story", category, true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!shouldRender || hidden) return;
    recordAdImpression(user?.id, "home_story", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender || hidden) return null;

  const handleClick = () => {
    recordAdClick(user?.id, "home_story", adUnitId, category);
    onClick?.();
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setHidden(true);
    await hideAd("general", adUnitId);
  };

  return (
    <div className={cn("flex flex-col items-center gap-1 flex-shrink-0 relative", className)}>
      {/* 3-dot hide menu - top right of avatar */}
      <div className="absolute top-0 right-0 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-5 w-5 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
              aria-label="Ad options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50">
            <DropdownMenuItem onClick={handleHide}>
              <X className="h-3.5 w-3.5 mr-2" />
              Hide this ad
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        onClick={handleClick}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-blue-600 to-blue-700 relative"
        aria-label="Sponsored story"
      >
        <div className="w-full h-full rounded-full border-2 border-background bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xs">
          {brandInitial}
        </div>
        {/* Sponsored badge - bottom-left over avatar */}
        <div className="absolute -bottom-0.5 -left-0.5 z-10">
          <TestAdBadge variant="small" />
        </div>
      </button>

      <span className="text-[11px] text-muted-foreground truncate max-w-[56px]">
        {brandName}
      </span>
    </div>
  );
};

export default SponsoredStory;
