import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AD_FREQUENCY, USE_TEST_ADS } from "@/lib/ads/adConfig";
import type { AdCategory, AdPlacement } from "@/lib/ads/adTypes";

interface AdContextValue {
  /** Whether the user can see another ad right now (daily cap). */
  canShowAd: () => boolean;
  /** Whether a specific ad unit is in cool-down (2hr same-ad rule). */
  isAdInCooldown: (adUnitId: string) => boolean;
  /** Whether a category is hidden (24hr block from "Hide Ad"). */
  isCategoryBlocked: (category: AdCategory) => boolean;
  /** Hide future ads from this category for 24hr. */
  hideAd: (category: AdCategory, adId?: string) => Promise<void>;
  /** Track impression locally (DB write happens in BaseAdSlot). */
  registerImpression: (adUnitId: string) => void;
  /** Daily impression count. */
  todayCount: number;
  /** Test mode flag exposed for ads UI. */
  isTestMode: boolean;
}

const AdContext = createContext<AdContextValue | null>(null);

export const AdProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [recentAdMap, setRecentAdMap] = useState<Map<string, number>>(new Map());
  const [blockedCategories, setBlockedCategories] = useState<Set<string>>(new Set());
  const [isNewUser, setIsNewUser] = useState(false);

  // Load daily count + blocked categories
  useEffect(() => {
    if (!user) {
      setTodayCount(0);
      setBlockedCategories(new Set());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [impRes, prefRes, profRes] = await Promise.all([
          supabase
            .from("ad_impressions")
            .select("id, ad_unit_id, created_at")
            .eq("user_id", user.id)
            .gte("created_at", dayAgo),
          supabase
            .from("user_ad_preferences")
            .select("blocked_category, blocked_until")
            .eq("user_id", user.id)
            .gt("blocked_until", new Date().toISOString()),
          supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
        ]);

        if (cancelled) return;

        const impressions = impRes.data || [];
        setTodayCount(impressions.length);

        const map = new Map<string, number>();
        impressions.forEach((i) => {
          if (i.ad_unit_id) {
            const t = new Date(i.created_at!).getTime();
            const prev = map.get(i.ad_unit_id) || 0;
            if (t > prev) map.set(i.ad_unit_id, t);
          }
        });
        setRecentAdMap(map);

        const blocked = new Set<string>();
        (prefRes.data || []).forEach((p) => {
          if (p.blocked_category) blocked.add(p.blocked_category);
        });
        setBlockedCategories(blocked);

        if (profRes.data?.created_at) {
          const ageHours = (Date.now() - new Date(profRes.data.created_at).getTime()) / 36e5;
          setIsNewUser(ageHours < AD_FREQUENCY.NEW_USER_REDUCTION_HOURS);
        }
      } catch {
        // Silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const canShowAd = useCallback(() => {
    const cap = isNewUser
      ? Math.floor(AD_FREQUENCY.MAX_PER_DAY * AD_FREQUENCY.NEW_USER_FREQUENCY_MULTIPLIER)
      : AD_FREQUENCY.MAX_PER_DAY;
    return todayCount < cap;
  }, [todayCount, isNewUser]);

  const isAdInCooldown = useCallback(
    (adUnitId: string) => {
      const last = recentAdMap.get(adUnitId);
      if (!last) return false;
      const gapMs = AD_FREQUENCY.MIN_GAP_HOURS_SAME_AD * 60 * 60 * 1000;
      return Date.now() - last < gapMs;
    },
    [recentAdMap]
  );

  const isCategoryBlocked = useCallback(
    (category: AdCategory) => blockedCategories.has(category),
    [blockedCategories]
  );

  const hideAd = useCallback(
    async (category: AdCategory, adId?: string) => {
      if (!user) return;
      setBlockedCategories((prev) => new Set(prev).add(category));
      try {
        await supabase.from("user_ad_preferences").insert({
          user_id: user.id,
          blocked_category: category,
          hidden_ad_id: adId ?? null,
        });
      } catch {
        // Silent
      }
    },
    [user]
  );

  const registerImpression = useCallback((adUnitId: string) => {
    setTodayCount((c) => c + 1);
    setRecentAdMap((prev) => {
      const next = new Map(prev);
      next.set(adUnitId, Date.now());
      return next;
    });
  }, []);

  const value = useMemo<AdContextValue>(
    () => ({
      canShowAd,
      isAdInCooldown,
      isCategoryBlocked,
      hideAd,
      registerImpression,
      todayCount,
      isTestMode: USE_TEST_ADS,
    }),
    [canShowAd, isAdInCooldown, isCategoryBlocked, hideAd, registerImpression, todayCount]
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export const useAds = () => {
  const ctx = useContext(AdContext);
  if (!ctx) {
    // Safe fallback: ads simply don't render if provider is missing
    return {
      canShowAd: () => false,
      isAdInCooldown: () => true,
      isCategoryBlocked: () => true,
      hideAd: async () => {},
      registerImpression: () => {},
      todayCount: 0,
      isTestMode: USE_TEST_ADS,
    } as AdContextValue;
  }
  return ctx;
};
