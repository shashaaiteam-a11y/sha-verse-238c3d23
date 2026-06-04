import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Globe, MoreHorizontal, X, ExternalLink, ChevronRight } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  recordAdImpression,
  recordAdClick,
  getAdUnitForPlacement,
} from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";
import { ADS_HIDDEN } from "@/lib/ads/adConfig";

/**
 * GroupNativeAd
 * Native ad styled to look like a group card. Used inside Groups module
 * (lists, discover, joined, created, category results) every 3–4 items.
 *
 * Variants:
 *  - "list":     matches horizontal group list cards (Groups.tsx All/Joined/Created/Category)
 *  - "discover": matches the small grid card used in Discover tab
 *  - "feed":     reserved (group posts feed already uses NativeAdCard)
 *
 * Self-contained: dismissible, tracks impressions/clicks, no impact on other modules.
 */
type Variant = "list" | "discover";

interface GroupNativeAdProps {
  variant?: Variant;
  className?: string;
}

const POOL = [
  { brand: "DesignHub", title: "Creative Designers Worldwide", members: 124300, cta: "Visit", color: "from-pink-500 to-rose-500" },
  { brand: "DevSpace", title: "Developer Community", members: 287500, cta: "Visit", color: "from-blue-500 to-indigo-500" },
  { brand: "StudyZone", title: "Crack Your Dream Exam", members: 96200, cta: "Visit", color: "from-emerald-500 to-teal-500" },
  { brand: "FoodieClub", title: "Daily Recipes & Foodies", members: 58900, cta: "Visit", color: "from-orange-500 to-amber-500" },
  { brand: "StartupLab", title: "Founders & Builders", members: 41700, cta: "Visit", color: "from-violet-500 to-purple-500" },
];

const GroupNativeAd = ({ variant = "list", className }: GroupNativeAdProps) => {
  // 🙈 GLOBAL SWITCH: hide this ad when ads are turned off.
  if (ADS_HIDDEN) return null;
  return <GroupNativeAdInner variant={variant} className={className} />;
};

const GroupNativeAdInner = ({ variant = "list", className }: GroupNativeAdProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const [dismissed, setDismissed] = useState(false);


  const sample = useMemo(() => POOL[Math.floor(Math.random() * POOL.length)], []);

  const placement = "group_list" as const;
  const adUnitId = getAdUnitForPlacement(placement);

  useEffect(() => {
    if (dismissed) return;
    recordAdImpression(user?.id, placement, adUnitId, "community");
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleClick = () => {
    recordAdClick(user?.id, placement, adUnitId, "community");
  };

  // ── Discover (grid-cell) variant ─────────────────────────────────
  if (variant === "discover") {
    return (
      <Card
        className={cn(
          "p-3 sm:p-4 text-center cursor-pointer hover:shadow-md transition-all relative",
          className
        )}
        onClick={handleClick}
      >
        <div className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-60 hover:opacity-100">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                <X className="w-4 h-4 mr-2" /> Hide ad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                <ExternalLink className="w-4 h-4 mr-2" /> Not interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2">
          <AvatarFallback className={cn("bg-gradient-to-br text-white font-bold text-sm sm:text-base", sample.color)}>
            {sample.brand[0]}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-xs sm:text-sm mb-0.5 truncate">{sample.brand}</h3>
        <div className="flex items-center justify-center gap-1 mb-2">
          <TestAdBadge variant="small" />
          <span className="text-[9px] text-muted-foreground">Sponsored</span>
        </div>
        <Button size="sm" className="w-full text-xs sm:text-sm h-8 sm:h-9 bg-gradient-primary">
          {sample.cta}
        </Button>
      </Card>
    );
  }

  // ── List (horizontal-row) variant ────────────────────────────────
  return (
    <Card
      className={cn(
        "p-3 sm:p-4 cursor-pointer hover:shadow-glow transition-all border-dashed border-primary/30",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
          <AvatarFallback className={cn("bg-gradient-to-br text-white font-bold text-base", sample.color)}>
            {sample.brand[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-sm sm:text-base truncate">{sample.brand}</h3>
            <TestAdBadge variant="small" />
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Sponsored</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1">{sample.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>Public</span>
            <span>•</span>
            <Users className="w-3 h-3" />
            <span className="font-medium">{sample.members.toLocaleString()} members</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                <X className="w-4 h-4 mr-2" /> Hide ad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                <ExternalLink className="w-4 h-4 mr-2" /> Not interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
};

export default GroupNativeAd;
