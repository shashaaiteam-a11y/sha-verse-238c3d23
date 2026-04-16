import { useAds } from "@/contexts/AdContext";
import { getAdUnitForPlacement } from "@/lib/ads/adAnalytics";
import type { AdPlacement, AdCategory } from "@/lib/ads/adTypes";

/**
 * Decide whether an ad slot should render right now.
 * Returns false if:
 *  - daily cap hit
 *  - same ad unit shown within last 2hr
 *  - category is hidden by user (24hr block)
 */
export function useAdFrequency(placement: AdPlacement, category: AdCategory = "general") {
  const { canShowAd, isAdInCooldown, isCategoryBlocked } = useAds();
  const adUnitId = getAdUnitForPlacement(placement);

  const shouldRender =
    canShowAd() && !isAdInCooldown(adUnitId) && !isCategoryBlocked(category);

  return { shouldRender, adUnitId };
}
