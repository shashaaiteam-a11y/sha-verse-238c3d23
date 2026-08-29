import { useEffect } from "react";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Users } from "lucide-react";

import TestAdBadge from "./TestAdBadge";

import { useAds } from "@/contexts/AdContext";

import { useAuth } from "@/contexts/AuthContext";

import { useAdFrequency } from "@/hooks/useAdFrequency";

import { useAdTargeting } from "@/hooks/useAdTargeting";

import { recordAdImpression } from "@/lib/ads/adAnalytics";

import { cn } from "@/lib/utils";
import { isNative } from "@/lib/ads/nativeAdMob";



interface SponsoredGroupCardProps {

  className?: string;

}



const SponsoredGroupCard = ({ className }: SponsoredGroupCardProps) => {

  const { user } = useAuth();

  const { registerImpression } = useAds();

  const { category } = useAdTargeting();

  const { shouldRender, adUnitId } = useAdFrequency("group_list", category);



  useEffect(() => {

    if (!shouldRender) return;

    recordAdImpression(user?.id, "group_list", adUnitId, category);

    registerImpression(adUnitId);

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  // On native (Android/iOS) real AdMob ads are served by the SDK — never show the web placeholder card.



  if (isNative()) return null;



  if (!shouldRender) return null;



  return (

    <Card className={cn("p-4 border border-border bg-card", className)}>

      <div className="flex items-start gap-3">

        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">

          <Users className="h-6 w-6 text-primary" />

        </div>



        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-1.5 mb-1">

            <TestAdBadge variant="small" />

            <span className="text-[10px] text-muted-foreground">Sponsored Group</span>

          </div>

          <h3 className="text-sm font-semibold text-foreground truncate">Featured Community</h3>

          <p className="text-xs text-muted-foreground line-clamp-2">

            Connect with thousands who share your interests.

          </p>

        </div>



        <Button size="sm" variant="outline" className="flex-shrink-0">

          Visit

        </Button>

      </div>

    </Card>

  );

};



export default SponsoredGroupCard;

