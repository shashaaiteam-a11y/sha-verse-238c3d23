import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, MoreHorizontal, Book } from "lucide-react";
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

/**
 * 📚 SponsoredBookCard
 *
 * Looks identical to a real BookCard — same 2:3 cover, title, author —
 * but carries a "Sponsored" tag. Used inside the Bookshelf grid (every 5–6 books)
 * and the dedicated "Sponsored Books" section.
 *
 * Native-style ad with the same dimensions as BookCard so the grid stays clean.
 */

interface SponsoredBookCardProps {
  className?: string;
}

const SAMPLE_BOOKS = [
  {
    title: "Atomic Reading Habits",
    author: "Sponsored • LearnHub",
    cover: "linear-gradient(135deg, #f59e0b, #ef4444)",
    cta: "Read Free",
    brand: "LearnHub",
  },
  {
    title: "Master Any Skill in 30 Days",
    author: "Sponsored • SkillUp",
    cover: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    cta: "Start Now",
    brand: "SkillUp",
  },
  {
    title: "Crack the Code Interview",
    author: "Sponsored • DevPrep",
    cover: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
    cta: "Try Free",
    brand: "DevPrep",
  },
  {
    title: "The Calm Mind Workbook",
    author: "Sponsored • MindEase",
    cover: "linear-gradient(135deg, #10b981, #14b8a6)",
    cta: "Get Sample",
    brand: "MindEase",
  },
];

const SponsoredBookCard = ({ className }: SponsoredBookCardProps) => {
  const { user } = useAuth();
  const { registerImpression, hideAd } = useAds();
  const { category } = useAdTargeting();
  const { adUnitId } = useAdFrequency("bookshelf_grid", category, true);
  const [dismissed, setDismissed] = useState(false);
  const [sample] = useState(
    () => SAMPLE_BOOKS[Math.floor(Math.random() * SAMPLE_BOOKS.length)]
  );

  useEffect(() => {
    if (dismissed) return;
    recordAdImpression(user?.id, "bookshelf_grid", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  const handleClick = () => {
    recordAdClick(user?.id, "bookshelf_grid", adUnitId, category);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative group",
        className
      )}
      onClick={handleClick}
    >
      {/* Cover area — same 2:3 ratio as BookCard */}
      <div
        className="aspect-[2/3] flex items-center justify-center relative"
        style={{ background: sample.cover }}
      >
        <Book className="w-12 h-12 text-white/80" />

        {/* Sponsored chip */}
        <div className="absolute top-2 left-2">
          <TestAdBadge variant="small" />
        </div>

        {/* Dismiss menu */}
        <div
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-black/30 hover:bg-black/50 text-white"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  hideAd(category);
                  setDismissed(true);
                }}
              >
                <X className="h-4 w-4 mr-2" /> Hide ad
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDismissed(true)}>
                Not interested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* CTA on hover */}
        <div className="absolute bottom-2 left-2 right-2">
          <Button
            size="sm"
            className="w-full h-7 text-xs bg-white/95 text-foreground hover:bg-white gap-1"
            onClick={handleClick}
          >
            {sample.cta}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Footer — matches BookCard padding */}
      <div className="p-2 sm:p-3">
        <h3 className="font-semibold text-sm line-clamp-1">{sample.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {sample.author}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Sponsored
          </span>
        </div>
      </div>
    </Card>
  );
};

export default SponsoredBookCard;
