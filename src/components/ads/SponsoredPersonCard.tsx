import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, MoreHorizontal, X } from "lucide-react";
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

interface SponsoredPersonCardProps {
  className?: string;
  brandName?: string;
  brandInitial?: string;
  ctaUrl?: string;
}

/**
 * PYMK-shaped native sponsored card. Pixel-matches the real friend card:
 * - w-32 width
 * - h-16 w-16 avatar
 * - same font, same button position
 */
const SponsoredPersonCard = ({
  className,
  brandName = "Featured Brand",
  brandInitial = "B",
  ctaUrl = "#",
}: SponsoredPersonCardProps) => {
  const { user } = useAuth();
  const { registerImpression, hideAd } = useAds();
  const { category } = useAdTargeting();
  // Force render in test mode (matches NativeAdCard/BannerAd behavior) so the
  // PYMK rail always shows the sponsored card at the calculated position.
  const { shouldRender, adUnitId } = useAdFrequency("novachat_suggestion", category, true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!shouldRender || hidden) return;
    recordAdImpression(user?.id, "novachat_suggestion", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender || hidden) return null;

  const handleClick = () => {
    recordAdClick(user?.id, "novachat_suggestion", adUnitId, category);
    if (ctaUrl && ctaUrl !== "#") {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleHide = async () => {
    setHidden(true);
    await hideAd("community", adUnitId);
  };

  return (
    <div className={cn("flex-shrink-0 w-32 text-center relative", className)}>
      {/* 3-dot hide menu */}
      <div className="absolute top-0 right-0 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 w-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center"
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

      {/* Brand "avatar" - rounded square to differentiate from people */}
      <div
        onClick={handleClick}
        className="h-16 w-16 mx-auto mb-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl"
      >
        {brandInitial}
      </div>

      <p
        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
        onClick={handleClick}
      >
        {brandName}
      </p>

      <div className="flex justify-center mb-2 mt-0.5">
        <TestAdBadge variant="small" />
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full mt-1"
        onClick={handleClick}
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        Visit
      </Button>
    </div>
  );
};

export default SponsoredPersonCard;
