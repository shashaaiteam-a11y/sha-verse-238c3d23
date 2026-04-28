import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAds } from "@/contexts/AdContext";
import { REWARDED_AD_REWARDS } from "@/lib/ads/adConfig";
import { recordAdImpression, getAdUnitForPlacement } from "@/lib/ads/adAnalytics";
import { showRewarded } from "@/lib/ads/nativeAdMob";
import type { RewardType, AdPlacement } from "@/lib/ads/adTypes";
import { toast } from "sonner";

interface UseRewardedAdOptions {
  rewardType: RewardType;
  placement: AdPlacement;
  /** Optional resource ID (e.g. book_id for premium unlock, post_id for boost). */
  resourceId?: string;
  /** Override default reward value. */
  customValue?: number;
}

/**
 * Hook for showing a rewarded ad and granting a reward on success.
 * In test mode, simulates a 3-second ad watch then grants the reward.
 */
export function useRewardedAd({
  rewardType,
  placement,
  resourceId,
  customValue,
}: UseRewardedAdOptions) {
  const { user } = useAuth();
  const { registerImpression } = useAds();
  const [isWatching, setIsWatching] = useState(false);

  const watchAd = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to watch rewarded ads");
      return false;
    }

    setIsWatching(true);

    try {
      const adUnitId = getAdUnitForPlacement(placement);

      // Native: real rewarded video. Web: simulated 3s in test mode.
      const earned = await showRewarded(adUnitId);
      if (!earned) {
        toast.error("Ad was not completed.");
        return false;
      }

      const config = REWARDED_AD_REWARDS[rewardType];
      const value = customValue ?? config.value;

      const { error } = await supabase.rpc("grant_rewarded_ad_unlock" as any, {
        _reward_type: rewardType,
        _reward_value: value ?? null,
        _resource_id: resourceId ?? null,
        _expires_minutes: config.expires_minutes ?? null,
      });

      if (error) throw error;

      await recordAdImpression(user.id, placement, adUnitId);
      registerImpression(adUnitId);

      toast.success("Reward unlocked! 🎁");
      return true;
    } catch (e) {
      toast.error("Could not load ad. Try again.");
      return false;
    } finally {
      setIsWatching(false);
    }
  }, [user, rewardType, placement, resourceId, customValue, registerImpression]);

  return { watchAd, isWatching };
}
