import { useAds } from "@/contexts/AdContext";
import { getAdUnitForPlacement } from "@/lib/ads/adAnalytics";
import { ADS_HIDDEN } from "@/lib/ads/adConfig";
import type { AdPlacement, AdCategory } from "@/lib/ads/adTypes";

/**
 * Decide whether an ad slot should render right now.
 * Returns false if:
 *  - ads are globally hidden (ADS_HIDDEN switch)
 *  - daily cap hit
 *  - same ad unit shown within last 2hr
 *  - category is hidden by user (24hr block)
 * 
 * For testing: Set forceShowAds = true to bypass all frequency checks
 */
export function useAdFrequency(placement: AdPlacement, category: AdCategory = "general", forceShowAds = false) {
  const { canShowAd, isAdInCooldown, isCategoryBlocked } = useAds();
  const adUnitId = getAdUnitForPlacement(placement);

  // 🙈 GLOBAL SWITCH: hide every ad slot when ads are turned off.
  // Takes priority over forceShowAds so no ad renders anywhere.
  if (ADS_HIDDEN) {
    return { shouldRender: false, adUnitId };
  }

  // 🧪 TEST MODE: Bypass frequency control when forceShowAds is true
  if (forceShowAds) {
    return { shouldRender: true, adUnitId };
  }

  const canShow = canShowAd();
  const inCooldown = isAdInCooldown(adUnitId);
  const catBlocked = isCategoryBlocked(category);
  const shouldRender = canShow && !inCooldown && !catBlocked;

  return { shouldRender, adUnitId };
}
