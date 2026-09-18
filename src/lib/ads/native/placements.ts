/**
 * Native ad placement registry.
 *
 * Every placement in the SHA-VERSE native-ads spec has a stable identifier
 * (used for analytics) and maps to an AdMob native ad unit family so that
 * performance can be measured per surface. Unit IDs come from the existing
 * central ads config — nothing is hardcoded here.
 */
import { AD_IDS } from "../adConfig";

export type NativePlacementId =
  | "HF_STORY_01"
  | "HF_STORY_02"
  | "HF_STORY_03"
  | "HF_POST_01"
  | "HF_POST_02"
  | "NC_HISTORY_01"
  | "NC_INPUT_01"
  | "NC_REPLY_01"
  | "BS_GRID_01"
  | "BS_DETAIL_01"
  | "BS_DETAIL_02"
  | "BS_READER_01"
  | "GR_TOP_01"
  | "GR_LIST_01"
  | "GR_POST_01"
  | "PF_POST_01";

/** Reserved height (CSS px) so the layout never jumps while an ad loads. */
export const PLACEMENT_HEIGHT: Record<NativePlacementId, number> = {
  HF_STORY_01: 92,
  HF_STORY_02: 420,
  HF_STORY_03: 110,
  HF_POST_01: 130,
  HF_POST_02: 260,
  NC_HISTORY_01: 96,
  NC_INPUT_01: 96,
  NC_REPLY_01: 150,
  BS_GRID_01: 220,
  BS_DETAIL_01: 110,
  BS_DETAIL_02: 280,
  BS_READER_01: 420,
  GR_TOP_01: 120,
  GR_LIST_01: 120,
  GR_POST_01: 240,
  PF_POST_01: 240,
};

/**
 * Ad unit per placement family. Reuses the configured SHA-VERSE native units;
 * surfaces without a dedicated unit fall back to the native feed unit.
 */
export function adUnitForPlacement(placement: NativePlacementId): string {
  switch (placement) {
    case "HF_STORY_01":
    case "HF_STORY_02":
    case "HF_STORY_03":
      return AD_IDS.sponsoredStory;
    case "GR_TOP_01":
    case "GR_LIST_01":
    case "GR_POST_01":
      return AD_IDS.sponsoredGroup;
    case "NC_HISTORY_01":
    case "NC_INPUT_01":
    case "NC_REPLY_01":
      return AD_IDS.sponsoredSuggestion;
    default:
      return AD_IDS.native;
  }
}

/** Legacy analytics placement mapping (existing ad_impressions table). */
export function legacyPlacement(placement: NativePlacementId) {
  switch (placement) {
    case "HF_STORY_01":
    case "HF_STORY_02":
    case "HF_STORY_03":
      return "home_story" as const;
    case "HF_POST_01":
      return "home_feed_after_create" as const;
    case "HF_POST_02":
      return "home_feed" as const;
    case "NC_HISTORY_01":
    case "NC_INPUT_01":
    case "NC_REPLY_01":
      return "novachat_suggestion" as const;
    case "BS_GRID_01":
      return "bookshelf_grid" as const;
    case "BS_DETAIL_01":
    case "BS_DETAIL_02":
      return "bookshelf_detail_banner" as const;
    case "BS_READER_01":
      return "bookshelf_reader_inline" as const;
    case "GR_TOP_01":
      return "group_discovery_banner" as const;
    case "GR_LIST_01":
      return "group_list" as const;
    case "GR_POST_01":
      return "group_feed" as const;
    case "PF_POST_01":
      return "profile_posts" as const;
  }
}
