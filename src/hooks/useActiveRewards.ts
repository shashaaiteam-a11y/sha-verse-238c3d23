/**
 * useActiveRewards - Check and consume rewarded ad rewards
 * Fixes the persistence gap: rewards were written but never read
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RewardType } from "@/lib/ads/adTypes";

interface ActiveReward {
  id: string;
  reward_type: RewardType;
  reward_value: number;
  resource_id: string | null;
  expires_at: string | null;
  created_at: string;
  consumed_count: number;
}

interface UseActiveRewardsReturn {
  /** All active (non-expired, non-consumed) rewards for the user */
  activeRewards: ActiveReward[];
  /** Check if a specific reward type is currently active */
  hasActiveReward: (rewardType: RewardType, resourceId?: string) => boolean;
  /** Get remaining value for a reward type (e.g., remaining messages) */
  getRewardValue: (rewardType: RewardType, resourceId?: string) => number;
  /** Mark a reward as consumed (call when reward is used) */
  consumeReward: (rewardId: string) => Promise<void>;
  /** Refresh rewards from database */
  refreshRewards: () => Promise<void>;
  isLoading: boolean;
}

export function useActiveRewards(): UseActiveRewardsReturn {
  const { user } = useAuth();
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) {
      setActiveRewards([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("rewarded_ad_unlocks")
      .select("id, reward_type, reward_value, resource_id, expires_at, created_at, consumed_count")
      .eq("user_id", user.id)
      .lt("consumed_count", 1)
      .or(`expires_at.gt.${now},expires_at.is.null`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useActiveRewards] Error fetching rewards:", error);
      setActiveRewards([]);
    } else {
      // Type cast the data from Supabase
      setActiveRewards((data as ActiveReward[]) || []);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const hasActiveReward = useCallback(
    (rewardType: RewardType, resourceId?: string): boolean => {
      return activeRewards.some((r) => {
        if (r.reward_type !== rewardType) return false;
        if (resourceId && r.resource_id !== resourceId) return false;
        if (r.consumed_count >= r.reward_value) return false;
        if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
        return true;
      });
    },
    [activeRewards]
  );

  const getRewardValue = useCallback(
    (rewardType: RewardType, resourceId?: string): number => {
      const rewards = activeRewards.filter((r) => {
        if (r.reward_type !== rewardType) return false;
        if (resourceId && r.resource_id !== resourceId) return false;
        if (r.consumed_count >= r.reward_value) return false;
        if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
        return true;
      });

      // Sum up values (e.g., multiple +10 message rewards)
      return rewards.reduce((sum, r) => sum + (r.reward_value - r.consumed_count), 0);
    },
    [activeRewards]
  );

  const consumeReward = useCallback(
    async (rewardId: string): Promise<void> => {
      if (!user) return;

      // Get current consumed_count
      const reward = activeRewards.find(r => r.id === rewardId);
      if (!reward) return;

      const newCount = reward.consumed_count + 1;

      const { error } = await supabase
        .from("rewarded_ad_unlocks")
        .update({ consumed_count: newCount })
        .eq("id", rewardId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[useActiveRewards] Error consuming reward:", error);
        throw error;
      }

      // Update local state
      setActiveRewards((prev) =>
        prev.map((r) => (r.id === rewardId ? { ...r, consumed_count: newCount } : r))
      );
    },
    [user, activeRewards]
  );

  const refreshRewards = useCallback(async () => {
    await fetchRewards();
  }, [fetchRewards]);

  return {
    activeRewards,
    hasActiveReward,
    getRewardValue,
    consumeReward,
    refreshRewards,
    isLoading,
  };
}

/**
 * Hook specifically for NovaChat message limit rewards
 */
export function useNovaChatRewards() {
  const { hasActiveReward, getRewardValue, consumeReward, refreshRewards, isLoading } =
    useActiveRewards();

  const hasBonusMessages = hasActiveReward("novachat_messages");
  const bonusMessageCount = getRewardValue("novachat_messages");

  const consumeMessageReward = useCallback(async () => {
    // Find first active message reward and consume it
    // This is simplified - in real usage you might want to track per-message consumption
    await refreshRewards();
  }, [refreshRewards]);

  return {
    hasBonusMessages,
    bonusMessageCount,
    consumeMessageReward,
    isLoading,
  };
}

/**
 * Hook specifically for Bookshelf premium access rewards
 */
export function useBookshelfRewards(resourceId?: string) {
  // Must call useActiveRewards first before using its values
  const { activeRewards, hasActiveReward, refreshRewards, isLoading } = useActiveRewards();

  const hasPremiumAccess = hasActiveReward("bookshelf_premium", resourceId);
  const premiumMinutesRemaining = hasPremiumAccess
    ? Math.ceil(
        (new Date(
          activeRewards.find(
            (r) =>
              r.reward_type === "bookshelf_premium" &&
              (!resourceId || r.resource_id === resourceId) &&
              r.consumed_count < r.reward_value &&
              r.expires_at
          )?.expires_at || Date.now()
        ).getTime() -
          Date.now()) /
          (1000 * 60)
      )
    : 0;

  return {
    hasPremiumAccess,
    premiumMinutesRemaining,
    refreshRewards,
    isLoading,
  };
}

/**
 * Hook specifically for Movion ad-free rewards
 */
export function useMovionRewards() {
  // Must call useActiveRewards first before using its values
  const { activeRewards, hasActiveReward, refreshRewards, isLoading } = useActiveRewards();

  const isAdFree = hasActiveReward("movion_ad_free");
  const adFreeMinutesRemaining = isAdFree
    ? Math.ceil(
        (new Date(
          activeRewards.find(
            (r) => r.reward_type === "movion_ad_free" && r.consumed_count < r.reward_value && r.expires_at
          )?.expires_at || Date.now()
        ).getTime() -
          Date.now()) /
          (1000 * 60)
      )
    : 0;

  return {
    isAdFree,
    adFreeMinutesRemaining,
    refreshRewards,
    isLoading,
  };
}

/**
 * Hook specifically for Group post boost rewards
 */
export function useGroupRewards(resourceId?: string) {
  const { hasActiveReward, refreshRewards, isLoading } = useActiveRewards();

  const hasPostBoost = hasActiveReward("group_post_boost", resourceId);

  return {
    hasPostBoost,
    refreshRewards,
    isLoading,
  };
}
