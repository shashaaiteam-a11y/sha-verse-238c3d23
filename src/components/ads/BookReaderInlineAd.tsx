import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, MoreHorizontal, BookOpen } from "lucide-react";
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
import { ADS_HIDDEN } from "@/lib/ads/adConfig";
import { isNative } from "@/lib/ads/nativeAdMob";

/**
 * 📖 BookReader Inline Ad
 *
 * High-CTR ad that surfaces inside the reader between pages.
 *
 * Two variants:
 *  - "inline" : appears every 3-4 pages between content
 *  - "chapter_end" : larger, full-bleed style for end-of-chapter / milestones
 *
 * STRICT RULES:
 *  - Skip first 2 pages and last page (handled by parent).
 *  - Never breaks paragraph mid-content (placed at natural section breaks).
 *  - Always dismissible.
 *  - Theme-aware (light / dark / sepia).
 */

interface BookReaderInlineAdProps {
  variant?: "inline" | "chapter_end";
  /** Reader theme so the ad blends with the page */
  theme?: "light" | "dark" | "sepia";
  className?: string;
  onDismiss?: () => void;
}

const SAMPLE_ADS_BY_CATEGORY: Record<string, { title: string; brand: string; cta: string; desc: string }[]> = {
  education: [
    { title: "Learn Faster With Smart Notes", brand: "NoteMaster", cta: "Try Free", desc: "AI-powered notes to remember more from every book you read." },
    { title: "Read 10 Books a Month", brand: "BookSummary+", cta: "Start Now", desc: "Key takeaways from bestsellers in 15 minutes." },
  ],
  lifestyle: [
    { title: "Build a Reading Habit", brand: "Readify", cta: "Get App", desc: "Daily reminders, streaks, and your private reading journal." },
  ],
  tech: [
    { title: "E-Books on Every Device", brand: "ReadCloud", cta: "Sync Now", desc: "Continue reading anywhere — phone, tablet, web." },
  ],
  saas_tools: [
    { title: "Highlight & Export Notes", brand: "Highlightly", cta: "Try Free", desc: "Save highlights from every book to one workspace." },
  ],
  general: [
    { title: "Discover Your Next Read", brand: "BookHub", cta: "Browse", desc: "Personalized book recommendations updated weekly." },
  ],
};

const THEME_STYLES: Record<string, { bg: string; border: string; text: string; muted: string }> = {
  light: { bg: "bg-white", border: "border-zinc-200", text: "text-zinc-900", muted: "text-zinc-500" },
  dark: { bg: "bg-zinc-800", border: "border-zinc-700", text: "text-zinc-100", muted: "text-zinc-400" },
  sepia: { bg: "bg-[#efe4cf]", border: "border-[#d8c8a8]", text: "text-[#5b4636]", muted: "text-[#8a7c66]" },
};

const BookReaderInlineAd = (props: BookReaderInlineAdProps) => {
  // 🙈 GLOBAL SWITCH: hide this ad when ads are turned off.
  // On native (Android/iOS) real AdMob ads are served by the SDK — never show the web placeholder card.
  if (isNative()) return null;
  if (ADS_HIDDEN) return null;
  return <BookReaderInlineAdInner {...props} />;
};

const BookReaderInlineAdInner = ({
  variant = "inline",
  theme = "light",
  className,
  onDismiss,
}: BookReaderInlineAdProps) => {
  const { user } = useAuth();
  const { registerImpression, hideAd } = useAds();
  const { category } = useAdTargeting();
  // Force-show in test mode so reader ads always render at the configured frequency
  const placement = variant === "chapter_end" ? "bookshelf_reader_inline" : "bookshelf_reader_inline";
  const { adUnitId } = useAdFrequency(placement, category, true);
  const [dismissed, setDismissed] = useState(false);

  const pool =
    SAMPLE_ADS_BY_CATEGORY[category] ?? SAMPLE_ADS_BY_CATEGORY.general;
  const sample = pool[Math.floor(Math.random() * pool.length)];
  const styles = THEME_STYLES[theme] ?? THEME_STYLES.light;

  useEffect(() => {
    if (dismissed) return;
    recordAdImpression(user?.id, placement, adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleClick = () => {
    recordAdClick(user?.id, placement, adUnitId, category);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (variant === "chapter_end") {
    return (
      <div className={cn("w-full max-w-2xl mx-auto my-6 px-4", className)}>
        <Card
          className={cn(
            "p-5 sm:p-6 border-2 shadow-sm",
            styles.bg,
            styles.border
          )}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className={cn("w-4 h-4", styles.muted)} />
              <span className={cn("text-xs uppercase tracking-wider font-semibold", styles.muted)}>
                Recommended for readers
              </span>
              <TestAdBadge variant="small" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7", styles.muted)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { hideAd(category); handleDismiss(); }}>
                  <X className="h-4 w-4 mr-2" /> Hide ad
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDismiss}>Not interested</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary font-bold text-lg">
              {sample.brand[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold mb-0.5", styles.text)}>{sample.brand}</p>
              <p className={cn("text-[11px]", styles.muted)}>Sponsored</p>
            </div>
          </div>

          <h3 className={cn("text-lg sm:text-xl font-bold mb-2 leading-snug", styles.text)}>
            {sample.title}
          </h3>
          <p className={cn("text-sm mb-4 leading-relaxed", styles.muted)}>
            {sample.desc}
          </p>

          <Button
            size="default"
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleClick}
          >
            {sample.cta}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  // Default "inline" variant — slimmer, blends into reading flow
  return (
    <div className={cn("w-full max-w-2xl mx-auto my-4 px-4", className)}>
      <Card
        className={cn(
          "p-4 border shadow-none",
          styles.bg,
          styles.border
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
              {sample.brand[0]}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold truncate", styles.text)}>{sample.brand}</p>
              <div className="flex items-center gap-1.5">
                <TestAdBadge variant="small" />
                <span className={cn("text-[10px]", styles.muted)}>Sponsored</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7", styles.muted)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { hideAd(category); handleDismiss(); }}>
                <X className="h-4 w-4 mr-2" /> Hide ad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDismiss}>Not interested</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className={cn("font-semibold mb-1 text-sm", styles.text)}>{sample.title}</h3>
        <p className={cn("text-xs mb-3", styles.muted)}>{sample.desc}</p>

        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          onClick={handleClick}
        >
          {sample.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  );
};

export default BookReaderInlineAd;
