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



interface VideoMidRollAdProps {

  onComplete: () => void;

  className?: string;

}



/**

 * Mid-roll ad — fires at the 50% mark of 3+ minute videos.

 * Skippable after 5 seconds.

 */

const VideoMidRollAd = ({ onComplete, className }: VideoMidRollAdProps) => {

  const { user } = useAuth();

  const { registerImpression } = useAds();

  const { category } = useAdTargeting();

  const { shouldRender, adUnitId } = useAdFrequency("movion_mid_roll", category);

  const [secondsLeft, setSecondsLeft] = useState(5);



  useEffect(() => {

    if (!shouldRender) {

      onComplete();

      return;

    }

    recordAdImpression(user?.id, "movion_mid_roll", adUnitId, category);

    registerImpression(adUnitId);

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  useEffect(() => {

    if (!shouldRender) return;

    if (secondsLeft <= 0) return;

    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);

    return () => clearTimeout(t);

  }, [secondsLeft, shouldRender]);



  if (!shouldRender) return null;



  return (

    <div className={cn("absolute inset-0 z-30 bg-black flex items-center justify-center", className)}>

      <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-primary/10 to-primary/30" />



      <div className="absolute top-3 left-3 flex items-center gap-2">

        <TestAdBadge variant="overlay" />

        <span className="text-[10px] text-white/80 uppercase tracking-wide">Mid-roll</span>

      </div>



      <div className="relative z-10 text-center text-white px-6">

        <p className="text-2xl font-bold mb-2">Brought to you by Brand</p>

        <p className="text-sm text-white/80">Sample mid-roll content</p>

      </div>



      <Button

        size="sm"

        onClick={onComplete}

        disabled={secondsLeft > 0}

        className="absolute bottom-4 right-4 bg-white/90 text-black hover:bg-white gap-1.5"

      >

        {secondsLeft > 0 ? (

          <>Skip in {secondsLeft}s</>

        ) : (

          <>

            Skip <SkipForward className="h-3.5 w-3.5" />

          </>

        )}

      </Button>

    </div>

  );

};



export default VideoMidRollAd;

