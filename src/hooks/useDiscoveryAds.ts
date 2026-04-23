import { useEffect, useMemo, useState } from "react";
import { useAds } from "@/contexts/AdContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { USE_TEST_ADS } from "@/lib/ads/adConfig";

type SlotType = "story" | "pymk";

interface DiscoveryAdsResult {
  /** Set of indices (0-based, in the real-items list) AFTER which an ad should be injected. */
  adPositions: Set<number>;
  /** True if we should render at least one ad in this rail. */
  enabled: boolean;
}

/**
 * Calculates ad injection positions for horizontal discovery rails
 * (Stories bar, People You May Know).
 *
 * Lightweight, real-time. Reuses AdContext for daily cap / category block.
 * Does NOT subscribe to anything new — pure derivation.
 */
export function useDiscoveryAds(itemCount: number, slotType: SlotType): DiscoveryAdsResult {
  const { user } = useAuth();
  const { canShowAd, isCategoryBlocked } = useAds();
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled || !data?.created_at) return;
        const ageHours = (Date.now() - new Date(data.created_at).getTime()) / 36e5;
        setIsNewUser(ageHours < 48);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return useMemo<DiscoveryAdsResult>(() => {
    const empty = { adPositions: new Set<number>(), enabled: false };

    // In test mode bypass daily-cap / category-block so the rails always
    // demonstrate the sponsored slot. Real frequency control is in AdContext.
    if (!USE_TEST_ADS) {
      if (!canShowAd()) return empty;
      const category = slotType === "pymk" ? "community" : "general";
      if (isCategoryBlocked(category as any)) return empty;
    }

    // Per-slot rules — softened for social discovery surfaces
    // Stories: 1 ad after 5-6 real stories (none for new users)
    // PYMK:    1 ad after 5 real cards (skip entirely if list is short)
    const everyN = 6;
    const maxAds = isNewUser ? 0 : 1;
    if (maxAds === 0) return empty;

    // PYMK: skip if fewer than 5 real suggestions (avoid "ad shelf" feel)
    if (slotType === "pymk" && itemCount < 5) return empty;

    // Stories: skip sponsored tile entirely when there are no friend stories
    if (slotType === "story" && itemCount === 0) return empty;

    const positions = new Set<number>();
    let injected = 0;
    // Inject AFTER index (everyN - 1), then every everyN
    for (let i = everyN - 1; i < itemCount && injected < maxAds; i += everyN) {
      positions.add(i);
      injected++;
    }

    return { adPositions: positions, enabled: positions.size > 0 };
  }, [itemCount, slotType, canShowAd, isCategoryBlocked, isNewUser]);
}
