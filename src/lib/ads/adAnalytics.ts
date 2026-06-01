import { supabase } from "@/integrations/supabase/client";
import { AD_IDS } from "./adConfig";
import type { AdPlacement, AdCategory } from "./adTypes";

/**
 * 🚀 Bulk analytics insert.
 * Ad impressions are buffered client-side and flushed to the database in a
 * single batched insert (up to 100 rows at a time). This drastically cuts the
 * number of network/DB writes vs. one insert per impression.
 *
 * - Flushes immediately once the buffer reaches BATCH_SIZE (100).
 * - Otherwise flushes after FLUSH_INTERVAL_MS so low-volume events still land.
 * - Also flushes when the tab is hidden / unloaded so nothing is lost.
 * - Fully silent on failure — ads/analytics must never break the UI.
 */
interface ImpressionRow {
  user_id: string;
  ad_unit_id: string;
  placement: AdPlacement;
  ad_category: AdCategory;
}

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 15_000;

const impressionBuffer: ImpressionRow[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushImpressions(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (impressionBuffer.length === 0) return;
  // Drain the buffer into a single batch
  const batch = impressionBuffer.splice(0, impressionBuffer.length);
  try {
    await supabase.from("ad_impressions").insert(batch);
  } catch {
    // Silent — never block UI. Events in this batch are dropped on failure.
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushImpressions();
  }, FLUSH_INTERVAL_MS);
}

// Flush remaining buffered events when the user leaves / backgrounds the app.
if (typeof window !== "undefined") {
  const flushOnLeave = () => {
    if (document.hidden) void flushImpressions();
  };
  document.addEventListener("visibilitychange", flushOnLeave);
  window.addEventListener("pagehide", () => void flushImpressions());
}

/**
 * Records an ad impression for frequency-control + analytics.
 * Buffered + batched. Silent failure — ads should never break the UI.
 */
export async function recordAdImpression(
  userId: string | undefined,
  placement: AdPlacement,
  adUnitId: string,
  category?: AdCategory
): Promise<void> {
  if (!userId) return;
  impressionBuffer.push({
    user_id: userId,
    ad_unit_id: adUnitId,
    placement,
    ad_category: category ?? "general",
  });

  if (impressionBuffer.length >= BATCH_SIZE) {
    void flushImpressions();
  } else {
    scheduleFlush();
  }
}

/**
 * Records an ad click for analytics.
 * Silent failure — ads should never break the UI.
 * Note: ad_clicks table needs to be created in database for full functionality.
 */
export async function recordAdClick(
  userId: string | undefined,
  placement: AdPlacement,
  adUnitId: string,
  category?: AdCategory
): Promise<void> {
  if (!userId) return;
  // 🚀 Click tracking placeholder - implement when ad_clicks table is ready
  // For now, log to console in test mode
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[Ad Click]", { userId: userId.slice(0, 8) + "...", placement, adUnitId, category });
  }
}

export function getAdUnitForPlacement(placement: AdPlacement): string {
  switch (placement) {
    case "home_banner":
    case "channel_banner":
    case "group_discovery_banner":
    case "bookshelf_detail_banner":
    case "novachat_banner":
      return AD_IDS.banner;
    case "bookshelf_reader_sticky":
      return AD_IDS.stickyBanner;
    case "home_feed":
    case "home_feed_after_create":
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
    case "movion_rewarded":
    case "bookshelf_rewarded":
    case "group_post_boost":
      return AD_IDS.rewarded;
    default:
      return AD_IDS.banner;
  }
}
