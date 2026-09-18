/**
 * Ad analytics wiring for native ads.
 *
 * Only placement identifiers and ad lifecycle events are recorded — never any
 * personal or sensitive user information. Impressions reuse the existing
 * batched ad_impressions pipeline so no new database surface is introduced.
 */
import { supabase } from "@/integrations/supabase/client";
import { recordAdImpression } from "../adAnalytics";
import { setAdAnalyticsSink, type AdAnalyticsEvent } from "./manager";
import { adUnitForPlacement, legacyPlacement, type NativePlacementId } from "./placements";

let currentUserId: string | undefined;

void supabase.auth.getUser().then(({ data }) => {
  currentUserId = data.user?.id;
});
supabase.auth.onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id;
});

let installed = false;

export function installNativeAdAnalytics() {
  if (installed) return;
  installed = true;

  setAdAnalyticsSink((event: AdAnalyticsEvent, placement: NativePlacementId) => {
    if (event === "ad_impression") {
      void recordAdImpression(currentUserId, legacyPlacement(placement), adUnitForPlacement(placement));
    }
  });
}
