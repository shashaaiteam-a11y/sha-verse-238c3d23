import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/ads/nativeAdMob";

interface SponsoredSuggestionProps {
  className?: string;
  onClick?: () => void;
}

/**
 * Drop-in card for NovaChat welcome screen suggestion grid.
 * Matches existing suggestion card style but marked "Sponsored".
 */
const SponsoredSuggestion = ({ className, onClick }: SponsoredSuggestionProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency("novachat_suggestion", category);

  useEffect(() => {
    if (!shouldRender) return;
    recordAdImpression(user?.id, "novachat_suggestion", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On native (Android/iOS) real AdMob ads are served by the SDK — never show the web placeholder card.

  if (isNative()) return null;

  if (!shouldRender) return null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer hover:bg-accent/50 transition-colors border border-border bg-card",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <TestAdBadge variant="small" />
          </div>
          <p className="text-sm font-medium text-foreground">Try a Sponsored Tool</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Featured AI assistant — boost your productivity
          </p>
        </div>
      </div>
    </Card>
  );
};

export default SponsoredSuggestion;
