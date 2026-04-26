import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, MoreHorizontal, X, ExternalLink } from "lucide-react";
import TestAdBadge from "@/components/ads/TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  recordAdImpression,
  recordAdClick,
  getAdUnitForPlacement,
} from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

/**
 * Native ad for the NovaChat sidebar conversation list.
 * Renders to look like a chat row so it feels native (chat-jaisa dikhe).
 * - Dismissible
 * - Records impression once
 * - Self-contained: no dependency on other module UI
 */
interface NovaChatSidebarAdProps {
  className?: string;
}

const POOL = [
  {
    brand: "GrammarFlow",
    title: "Write better, faster",
    cta: "Try Free",
  },
  {
    brand: "DevTools Pro",
    title: "AI-powered IDE",
    cta: "Get Started",
  },
  {
    brand: "LearnHub",
    title: "Master any subject",
    cta: "Start Free",
  },
  {
    brand: "FlowApp",
    title: "Automate your work",
    cta: "Try Now",
  },
];

const NovaChatSidebarAd = ({ className }: NovaChatSidebarAdProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const [dismissed, setDismissed] = useState(false);

  const sample = useMemo(() => POOL[Math.floor(Math.random() * POOL.length)], []);

  const placement = "novachat_suggestion" as const;
  const adUnitId = getAdUnitForPlacement(placement);

  useEffect(() => {
    if (dismissed) return;
    recordAdImpression(user?.id, placement, adUnitId, "saas_tools");
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleClick = () => {
    recordAdClick(user?.id, placement, adUnitId, "saas_tools");
  };

  return (
    <div
      className={cn(
        // Match conversation-row dimensions exactly so the ad fits the sidebar.
        // Single-line layout, subtle background instead of dashed border to avoid overflow.
        "group flex items-center gap-2 px-3 py-2 my-1 rounded-lg cursor-pointer transition-colors",
        "bg-primary/5 hover:bg-primary/10 w-full max-w-full overflow-hidden box-border",
        className
      )}
      onClick={handleClick}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary" />

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-sm font-medium min-w-0 flex-1">{sample.brand}</span>
          <TestAdBadge variant="small" className="flex-shrink-0" />
        </div>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {sample.title}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 flex-shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDismissed(true); }}>
            <X className="w-4 h-4 mr-2" />
            Hide ad
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDismissed(true); }}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Not interested
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NovaChatSidebarAd;
