/**
 * 🚨 SHA-VERSE ADS CONFIG — TEST MODE 🚨
 *
 * ⚠️ CRITICAL: This file controls whether real or test ads are shown.
 *
 * RULE: Keep `USE_TEST_ADS = true` until the app is published on Play Store.
 * Clicking your own real ads = Google AdMob account PERMANENT BAN.
 *
 * To switch to production (Play Store launch only):
 *   1. Get real Ad Unit IDs from https://admob.google.com
 *   2. Paste them in `LIVE_AD_IDS` below
 *   3. Set `USE_TEST_ADS = false`
 *   4. Build & ship
 */

export const USE_TEST_ADS = true;

// ✅ Google official test IDs — safe to click, no ban risk
const TEST_AD_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  native: "ca-app-pub-3940256099942544/2247696110",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
  videoPreRoll: "ca-app-pub-3940256099942544/8691691433",
  videoMidRoll: "ca-app-pub-3940256099942544/8691691433",
  shorts: "ca-app-pub-3940256099942544/8691691433",
  sponsoredStory: "ca-app-pub-3940256099942544/2247696110",
  sponsoredGroup: "ca-app-pub-3940256099942544/2247696110",
  sponsoredSuggestion: "ca-app-pub-3940256099942544/2247696110",
  stickyBanner: "ca-app-pub-3940256099942544/6300978111",
} as const;

// ⚠️ Replace with real AdMob unit IDs before publishing to Play Store
const LIVE_AD_IDS = {
  banner: "",
  native: "",
  rewarded: "",
  videoPreRoll: "",
  videoMidRoll: "",
  shorts: "",
  sponsoredStory: "",
  sponsoredGroup: "",
  sponsoredSuggestion: "",
  stickyBanner: "",
} as const;

export const AD_IDS = USE_TEST_ADS ? TEST_AD_IDS : LIVE_AD_IDS;

export const AD_FREQUENCY = {
  MAX_PER_DAY: 20,
  MIN_GAP_HOURS_SAME_AD: 2,
  HIDE_BLOCK_HOURS: 24,
  NEW_USER_REDUCTION_HOURS: 48,
  NEW_USER_FREQUENCY_MULTIPLIER: 0.5,
  // Slot intervals
  HOME_FEED_EVERY_N_POSTS: 5,
  MOVION_GRID_EVERY_N_VIDEOS: 6,
  SHORTS_EVERY_N: 6,
  BOOKSHELF_GRID_EVERY_N: 5,
  GROUP_LIST_EVERY_N: 5,
  GROUP_FEED_EVERY_N_POSTS: 5,
  PROFILE_POSTS_EVERY_N: 5,
  READER_PAGES_PER_AD: 10,
} as const;

export const REWARDED_AD_REWARDS = {
  novachat_messages: { value: 10, expires_minutes: null },
  bookshelf_premium: { value: 1, expires_minutes: 15 },
  movion_ad_free: { value: 1, expires_minutes: 60 },
  group_post_boost: { value: 1, expires_minutes: 1440 },
} as const;

if (typeof window !== "undefined" && USE_TEST_ADS) {
  // eslint-disable-next-line no-console
  console.warn(
    "🧪 TEST ADS MODE ACTIVE — Real ads disabled. Switch USE_TEST_ADS=false in src/lib/ads/adConfig.ts before Play Store launch."
  );
}
