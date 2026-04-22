import { useEffect } from "react";
import TestAdBadge from "./TestAdBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

interface SponsoredPYMKCardProps {
  className?: string;
}

/**
 * 📢 Native sponsored card for "People You May Know" horizontal strip.
 * Matches the exact dimensions/layout of a normal PYMK suggestion card
 * (w-32, 64x64 avatar, name, sub-line, full-width button) so it feels
 * native — only the "Sponsored" badge + CTA distinguish it.
 */
const SponsoredPYMKCard = ({ className }: SponsoredPYMKCardProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency("home_pymk", category);

  useEffect(() => {
    if (!shouldRender) return;
    recordAdImpression(user?.id, "home_pymk", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={cn("flex-shrink-0 w-32 text-center", className)}>
      <div className="relative">
        <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-primary/20">
          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="absolute top-0 right-2">
          <TestAdBadge variant="small" />
        </div>
      </div>
      <p className="text-sm font-medium truncate">Featured Brand</p>
      <p className="text-xs text-muted-foreground mb-2">Sponsored</p>
      <Button size="sm" variant="outline" className="w-full mt-1" type="button">
        Learn More
      </Button>
    </div>
  );
};

export default SponsoredPYMKCard;
