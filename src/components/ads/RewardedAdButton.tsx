import { Button } from "@/components/ui/button";
import { Gift, Loader2 } from "lucide-react";
import TestAdBadge from "./TestAdBadge";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { ADS_HIDDEN } from "@/lib/ads/adConfig";
import type { RewardType, AdPlacement } from "@/lib/ads/adTypes";
import { cn } from "@/lib/utils";

interface RewardedAdButtonProps {
  rewardType: RewardType;
  placement: AdPlacement;
  resourceId?: string;
  rewardLabel: string; // e.g. "10 messages"
  onRewardGranted?: () => void;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
  className?: string;
  fullWidth?: boolean;
}

const RewardedAdButton = (props: RewardedAdButtonProps) => {
  // 🙈 GLOBAL SWITCH: hide this ad button when ads are turned off.
  if (ADS_HIDDEN) return null;
  return <RewardedAdButtonInner {...props} />;
};

const RewardedAdButtonInner = ({
  rewardType,
  placement,
  resourceId,
  rewardLabel,
  onRewardGranted,
  variant = "default",
  size = "default",
  className,
  fullWidth,
}: RewardedAdButtonProps) => {
  const { watchAd, isWatching } = useRewardedAd({ rewardType, placement, resourceId });

  const handleClick = async () => {
    const ok = await watchAd();
    if (ok && onRewardGranted) onRewardGranted();
  };

  return (
    <div className={cn("flex flex-col items-stretch gap-1", fullWidth && "w-full", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isWatching}
        className={cn("gap-2", fullWidth && "w-full")}
      >
        {isWatching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading ad…
          </>
        ) : (
          <>
            <Gift className="h-4 w-4" /> Watch ad to unlock {rewardLabel}
          </>
        )}
      </Button>
      <div className="flex justify-center">
        <TestAdBadge variant="small" />
      </div>
    </div>
  );
};

export default RewardedAdButton;
