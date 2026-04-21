import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, MoreHorizontal, X, Sparkles } from "lucide-react";
import TestAdBadge from "@/components/ads/TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { recordAdImpression, getAdUnitForPlacement, recordAdClick } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

/**
 * NovaChat-specific inline ad. Self-contained, no dependency on other module UIs.
 * - Smart contextual ad picked from chat content (coding / writing / study / business)
 * - Native chat-bubble look so it does not feel intrusive
 * - Dismissible per render
 * - Records impression once on mount
 *
 * STRATEGY:
 *  - "Inline" variant: shown every N messages inside the chat list
 *  - "AfterResponse" variant: shown right after an AI response
 */
type Variant = "inline" | "after_response";

interface NovaChatInlineAdProps {
  /** Free-form user/assistant text used to pick a contextual ad. */
  contextText?: string;
  variant?: Variant;
  className?: string;
}

type AdContext = "coding" | "writing" | "study" | "business" | "general";

const AD_POOL: Record<AdContext, { brand: string; title: string; desc: string; cta: string }[]> = {
  coding: [
    { brand: "DevTools Pro", title: "Ship code 10× faster", desc: "AI-powered IDE with smart autocomplete and inline reviews.", cta: "Try Free" },
    { brand: "CloudDeploy", title: "1-click deployments", desc: "Push to production from your terminal in seconds.", cta: "Get Started" },
  ],
  writing: [
    { brand: "GrammarFlow", title: "Write with confidence", desc: "Real-time grammar, tone & clarity suggestions.", cta: "Install Free" },
    { brand: "DraftAI", title: "Beat the blank page", desc: "Generate outlines, intros and emails in seconds.", cta: "Try Now" },
  ],
  study: [
    { brand: "LearnHub", title: "Master any subject", desc: "Bite-sized courses from top universities.", cta: "Start Free" },
    { brand: "ExamPrep+", title: "Crack your dream exam", desc: "AI-personalized study plans and mock tests.", cta: "Try Free" },
  ],
  business: [
    { brand: "FlowApp", title: "Automate your workflow", desc: "Connect 500+ apps. Save hours every week.", cta: "Get Started" },
    { brand: "SalesIQ", title: "Close more deals", desc: "Smart CRM that actually understands your pipeline.", cta: "Free Trial" },
  ],
  general: [
    { brand: "Sha-Verse", title: "Discover something new", desc: "Curated tools and offers picked for you.", cta: "Learn More" },
  ],
};

function detectContext(text: string): AdContext {
  if (!text) return "general";
  const t = text.toLowerCase();
  if (/\b(code|function|bug|api|react|python|javascript|typescript|sql|debug|class|component)\b/.test(t)) return "coding";
  if (/\b(write|email|essay|blog|letter|story|draft|grammar|caption|paragraph)\b/.test(t)) return "writing";
  if (/\b(math|physics|exam|study|learn|homework|history|chemistry|equation|solve)\b/.test(t)) return "study";
  if (/\b(business|marketing|startup|sales|customer|revenue|strategy|crm|finance)\b/.test(t)) return "business";
  return "general";
}

const NovaChatInlineAd = ({ contextText = "", variant = "inline", className }: NovaChatInlineAdProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const [dismissed, setDismissed] = useState(false);

  const ctx = useMemo(() => detectContext(contextText), [contextText]);
  const sample = useMemo(() => {
    const pool = AD_POOL[ctx];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [ctx]);

  const placement = "novachat_suggestion" as const;
  const adUnitId = getAdUnitForPlacement(placement);

  useEffect(() => {
    if (dismissed) return;
    recordAdImpression(user?.id, placement, adUnitId, "saas_tools");
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const isAfter = variant === "after_response";

  return (
    <div className={cn("w-full px-4 py-3 flex justify-center", className)}>
      <Card
        className={cn(
          "w-full max-w-2xl overflow-hidden border bg-card relative p-3",
          isAfter
            ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
            : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
              {isAfter ? <Sparkles className="w-4 h-4" /> : sample.brand[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {isAfter ? `Recommended for you · ${sample.brand}` : sample.brand}
              </p>
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
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                <X className="h-4 w-4 mr-2" /> Hide ad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                Not interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-foreground text-sm mb-1">{sample.title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{sample.desc}</p>

        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          onClick={() => recordAdClick(user?.id, placement, adUnitId, "saas_tools")}
        >
          {sample.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
};

export default NovaChatInlineAd;
