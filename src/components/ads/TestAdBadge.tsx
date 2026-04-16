import { USE_TEST_ADS } from "@/lib/ads/adConfig";
import { cn } from "@/lib/utils";

interface TestAdBadgeProps {
  variant?: "default" | "small" | "overlay";
  label?: string;
  className?: string;
}

/**
 * Mandatory "Ad" badge shown on every ad placement.
 * In test mode, label says "Test Ad" for extra clarity.
 */
const TestAdBadge = ({ variant = "default", label, className }: TestAdBadgeProps) => {
  const text = label ?? (USE_TEST_ADS ? "Test Ad" : "Ad");

  const sizeClasses =
    variant === "small"
      ? "text-[9px] px-1.5 py-0.5"
      : variant === "overlay"
      ? "text-[10px] px-2 py-0.5"
      : "text-[10px] px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded uppercase tracking-wide",
        "bg-muted text-muted-foreground border border-border",
        sizeClasses,
        className
      )}
    >
      {text}
    </span>
  );
};

export default TestAdBadge;
