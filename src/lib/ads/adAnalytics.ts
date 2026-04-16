import { supabase } from "@/integrations/supabase/client";
import { AD_IDS } from "./adConfig";
import type { AdPlacement, AdCategory } from "./adTypes";

/**
 * Records an ad impression for frequency-control + analytics.
 * Silent failure — ads should never break the UI.
 */
export async function recordAdImpression(
  userId: string | undefined,
  placement: AdPlacement,
  adUnitId: string,
  category?: AdCategory
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from("ad_impressions").insert({
      user_id: userId,
      ad_unit_id: adUnitId,
      placement,
      ad_category: category ?? "general",
    });
  } catch (e) {
    // Silent — never block UI
  }
}

export function getAdUnitForPlacement(placement: AdPlacement): string {
  switch (placement) {
    case "home_banner":
    case "channel_banner":
    case "group_discovery_banner":
    case "bookshelf_detail_banner":
      return AD_IDS.banner;
    case "bookshelf_reader_sticky":
      return AD_IDS.stickyBanner;
    case "home_feed":
    case "movion_grid":
    case "bookshelf_grid":
    case "bookshelf_reader_inline":
    case "group_feed":
    case "profile_posts":
      return AD_IDS.native;
    case "home_story":
      return AD_IDS.sponsoredStory;
    case "group_list":
      return AD_IDS.sponsoredGroup;
    case "novachat_suggestion":
      return AD_IDS.sponsoredSuggestion;
    case "movion_pre_roll":
      return AD_IDS.videoPreRoll;
    case "movion_mid_roll":
      return AD_IDS.videoMidRoll;
    case "shorts_scroll":
      return AD_IDS.shorts;
    case "novachat_rewarded":
    case "bookshelf_rewarded":
    case "group_post_boost":
      return AD_IDS.rewarded;
    default:
      return AD_IDS.banner;
  }
}
