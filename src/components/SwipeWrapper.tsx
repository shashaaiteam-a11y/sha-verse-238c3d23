import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { ReactNode } from "react";

export const SwipeWrapper = ({ children }: { children: ReactNode }) => {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="flex-1 min-h-0">
      {children}
    </div>
  );
};
