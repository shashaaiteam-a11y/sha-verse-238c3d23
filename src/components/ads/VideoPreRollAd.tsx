import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdFrequency } from "@/hooks/useAdFrequency";
import { useAdTargeting } from "@/hooks/useAdTargeting";
import { recordAdImpression } from "@/lib/ads/adAnalytics";
import { cn } from "@/lib/utils";

interface VideoPreRollAdProps {
  onComplete: () => void;
  className?: string;
  /** Force show even if frequency cap hit — used for first-watch enforcement. */
  forceShow?: boolean;
}

/**
 * 5-second skippable pre-roll. Calls onComplete when ad finishes
 * OR is skipped, so the host video player can resume.
 */
const VideoPreRollAd = ({ onComplete, className, forceShow }: VideoPreRollAdProps) => {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const { category } = useAdTargeting();
  const { shouldRender, adUnitId } = useAdFrequency("movion_pre_roll", category);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [completed, setCompleted] = useState(false);

  const active = forceShow || shouldRender;

  useEffect(() => {
    if (!active) {
      onComplete();
      return;
    }
    recordAdImpression(user?.id, "movion_pre_roll", adUnitId, category);
    registerImpression(adUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, active]);

  if (!active || completed) return null;

  const handleSkip = () => {
    setCompleted(true);
    onComplete();
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 bg-black flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/10 to-accent/30" />

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <TestAdBadge variant="overlay" />
        <span className="text-[10px] text-white/80 uppercase tracking-wide">Sponsored</span>
      </div>

      <div className="relative z-10 text-center text-white px-6">
        <p className="text-2xl font-bold mb-2">Featured Brand</p>
        <p className="text-sm text-white/80 mb-1">Sample sponsored video</p>
      </div>

      <Button
        size="sm"
        onClick={handleSkip}
        disabled={secondsLeft > 0}
        className="absolute bottom-4 right-4 bg-white/90 text-black hover:bg-white gap-1.5"
      >
        {secondsLeft > 0 ? (
          <>Skip in {secondsLeft}s</>
        ) : (
          <>
            Skip ad <SkipForward className="h-3.5 w-3.5" />
          </>
        )}
      </Button>
    </div>
  );
};

export default VideoPreRollAd;
