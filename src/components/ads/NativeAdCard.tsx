import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, MoreHorizontal } from "lucide-react";
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
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import type { AdPlacement } from "@/lib/ads/adTypes";
import { cn } from "@/lib/utils";
import { ADS_HIDDEN } from "@/lib/ads/adConfig";
import { isNative } from "@/lib/ads/nativeAdMob";

interface NativeAdCardProps {
  placement: AdPlacement;
  className?: string;
  compact?: boolean;
  /** @deprecated Testing only - forces ad to show bypassing frequency control */
  _forceShow?: boolean;
}

const SAMPLE_ADS_BY_CATEGORY: Record<string, { title: string; brand: string; cta: string; desc: string }[]> = {
  education: [
    { title: "Master New Skills Online", brand: "LearnHub", cta: "Start Free", desc: "Thousands of courses from top universities. Learn at your pace." },
    { title: "Crack Your Dream Exam", brand: "ExamPrep+", cta: "Try Free", desc: "Personalized study plans powered by AI." },
  ],
  entertainment: [
    { title: "Stream Blockbuster Movies", brand: "CineFlix", cta: "Watch Now", desc: "Unlimited movies and series. First month free." },
  ],
  tech: [
    { title: "Build Apps 10x Faster", brand: "DevTools Pro", cta: "Try Free", desc: "Modern tooling for modern developers." },
  ],
  saas_tools: [
    { title: "Automate Your Workflow", brand: "FlowApp", cta: "Get Started", desc: "Connect 500+ apps. Save hours every week." },
  ],
  lifestyle: [
    { title: "Fresh Recipes Daily", brand: "TasteBox", cta: "Order Now", desc: "Curated meal kits delivered to your door." },
  ],
  community: [
    { title: "Join Local Events", brand: "MeetSpace", cta: "Explore", desc: "Find events and people near you." },
  ],
  general: [
    { title: "Discover Something New", brand: "Sponsored", cta: "Learn More", desc: "Featured offer just for you." },
  ],
};

// 🧪 SIMPLE TEST AD - Always renders for debugging
const TEST_SAMPLE = { title: "Test Ad - LearnHub", brand: "LearnHub", cta: "Start Free", desc: "Test ad description" };

const NativeAdCard = ({ placement, className, compact, _forceShow = true }: NativeAdCardProps) => {
  const { user } = useAuth();
  const { registerImpression, hideAd } = useAds();
  const { category } = useAdTargeting();
  // 🧪 TEST MODE: _forceShow=true bypasses frequency control for testing
  const { shouldRender, adUnitId } = useAdFrequency(placement, category, _forceShow);
  const [dismissed, setDismissed] = useState(false);

  // (Debug logging removed — it ran on every render and spammed the console,
  // wasting CPU and making the app feel laggy, especially in the Android WebView.)

  // Pick a sample ad
  const pool = SAMPLE_ADS_BY_CATEGORY[category] ?? SAMPLE_ADS_BY_CATEGORY.general;
  const sample = pool[Math.floor(Math.random() * pool.length)] || TEST_SAMPLE;

  useEffect(() => {
    if (!shouldRender || dismissed) return;
    recordAdImpression(user?.id, placement, adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🧪 TEST MODE: Force render if _forceShow is true
  // 🙈 GLOBAL SWITCH: ADS_HIDDEN overrides everything so no ad renders.
  const effectiveShouldRender = ADS_HIDDEN ? false : (_forceShow ? true : shouldRender);
  
  if (!effectiveShouldRender || dismissed) {
    return null;
  }

  // On native the AdMob SDK serves real ads (banner/rewarded) — no web placeholder card.
  if (isNative()) return null;


  return (
    <Card
      className={cn(
        "overflow-hidden border border-border bg-card relative",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
            {sample.brand[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{sample.brand}</p>
            <div className="flex items-center gap-1.5">
              <TestAdBadge variant="small" />
              <span className="text-[10px] text-muted-foreground">Sponsored</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { hideAd(category); setDismissed(true); }}>
              <X className="h-4 w-4 mr-2" /> Hide ad
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDismissed(true)}>
              Not interested
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className={cn("font-semibold text-foreground mb-1", compact ? "text-sm" : "text-base")}>
        {sample.title}
      </h3>
      <p className={cn("text-muted-foreground mb-3", compact ? "text-xs" : "text-sm")}>
        {sample.desc}
      </p>

      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
        {sample.cta}
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Card>
  );
};

export default NativeAdCard;
