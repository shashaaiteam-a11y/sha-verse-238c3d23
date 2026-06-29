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

/**
 * 🙈 GLOBAL ADS VISIBILITY SWITCH
 *
 * Set to `true`  → ALL ads are hidden everywhere (nothing renders).
 * Set to `false` → ads behave exactly as before (fully restored).
 *
 * This ONLY controls visibility. No ad code, placements, IDs, frequency
 * rules, or components are removed — flipping this back to `false` brings
 * everything back exactly as it is now.
 */
export const ADS_HIDDEN = false;

// ✅ Google official test IDs — safe to click, no ban risk
const TEST_AD_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  native: "ca-app-pub-3940256099942544/2247696110",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
  rewardedBookshelf: "ca-app-pub-3940256099942544/5224354917",
  rewardedMovion: "ca-app-pub-3940256099942544/5224354917",
  rewardedNovachat: "ca-app-pub-3940256099942544/5224354917",
  groupBoost: "ca-app-pub-3940256099942544/5224354917",
  videoPreRoll: "ca-app-pub-3940256099942544/8691691433",
  videoMidRoll: "ca-app-pub-3940256099942544/8691691433",
  shorts: "ca-app-pub-3940256099942544/8691691433",
  sponsoredStory: "ca-app-pub-3940256099942544/2247696110",
  sponsoredGroup: "ca-app-pub-3940256099942544/2247696110",
  sponsoredSuggestion: "ca-app-pub-3940256099942544/2247696110",
  stickyBanner: "ca-app-pub-3940256099942544/6300978111",
} as const;

// ✅ Real Sha-Verse AdMob unit IDs (used when USE_TEST_ADS = false on Play Store launch).
// Slots without a dedicated real unit reuse the closest matching real format
// (native for sponsored cards, video for shorts) so no slot ever serves an empty ID.
const LIVE_AD_IDS = {
  banner: "ca-app-pub-2928763177849470/4320904440",            // SHA-VERSE_BANNER HOME
  native: "ca-app-pub-2928763177849470/9916461611",            // SHA-VERSE_NATIVE FEED
  rewarded: "ca-app-pub-2928763177849470/8765965812",          // generic fallback (Bookshelf)
  rewardedBookshelf: "ca-app-pub-2928763177849470/8765965812", // SHA-VERSE_REWARDED BOOKSHELF
  rewardedMovion: "ca-app-pub-2928763177849470/9064899001",    // SHA-VERSE_REWARDED MOVION
  rewardedNovachat: "ca-app-pub-2928763177849470/8691394298",  // SHA-VERSE_REWARDED NOVACHAT
  groupBoost: "ca-app-pub-2928763177849470/3370168902",        // SHA-VERSE_GROUPBOOST
  videoPreRoll: "ca-app-pub-2928763177849470/1186858692",      // SHA-VERSE_VIDEO PRE ROLL
  videoMidRoll: "ca-app-pub-2928763177849470/4391156828",      // SHA-VERSE_VIDEO MID ROLL
  shorts: "ca-app-pub-2928763177849470/4391156828",            // reuse video (no dedicated unit)
  sponsoredStory: "ca-app-pub-2928763177849470/9916461611",    // reuse native feed
  sponsoredGroup: "ca-app-pub-2928763177849470/9916461611",    // reuse native feed
  sponsoredSuggestion: "ca-app-pub-2928763177849470/9916461611", // reuse native feed
  stickyBanner: "ca-app-pub-2928763177849470/3634958446",      // SHA-VERSE_STICKY BANNER
} as const;

export const AD_IDS = USE_TEST_ADS ? TEST_AD_IDS : LIVE_AD_IDS;

export const AD_FREQUENCY = {
  MAX_PER_DAY: 20,
  MIN_GAP_HOURS_SAME_AD: 2,
  HIDE_BLOCK_HOURS: 24,
  NEW_USER_REDUCTION_HOURS: 48,
  NEW_USER_FREQUENCY_MULTIPLIER: 0.5,
  // Slot intervals (UI-optimized)
  HOME_FEED_EVERY_N_POSTS: 5,
  MOVION_GRID_EVERY_N_VIDEOS: 6,
  SHORTS_EVERY_N: 6,
  BOOKSHELF_GRID_EVERY_N: 4,      // Every 4 books (2 rows in 2-col grid)
  GROUP_LIST_POSITION: 3,         // 3rd position specifically
  GROUP_FEED_EVERY_N_POSTS: 5,
  PROFILE_POSTS_EVERY_N: 4,       // Every 4 posts
  READER_PAGES_PER_AD: 20,
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
