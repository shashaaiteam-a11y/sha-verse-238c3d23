export type AdPlacement =
  | "home_feed"
  | "home_feed_after_create"
  | "home_story"
  | "home_banner"
  | "movion_grid"
  | "movion_pre_roll"
  | "movion_mid_roll"
  | "movion_rewarded"
  | "shorts_scroll"
  | "channel_banner"
  | "novachat_suggestion"
  | "novachat_banner"
  | "novachat_rewarded"
  | "bookshelf_grid"
  | "bookshelf_detail_banner"
  | "bookshelf_reader_inline"
  | "bookshelf_reader_sticky"
  | "bookshelf_rewarded"
  | "group_list"
  | "group_feed"
  | "group_discovery_banner"
  | "group_post_boost"
  | "profile_posts";

export type AdCategory =
  | "education"
  | "entertainment"
  | "tech"
  | "lifestyle"
  | "saas_tools"
  | "community"
  | "general";

export type RewardType =
  | "novachat_messages"
  | "bookshelf_premium"
  | "movion_ad_free"
  | "group_post_boost";

export interface AdImpression {
  placement: AdPlacement;
  ad_unit_id: string;
  ad_category?: AdCategory;
}

export interface RewardedAdResult {
  success: boolean;
  reward_type: RewardType;
  reward_value: number;
  expires_at?: string;
}

export interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}
