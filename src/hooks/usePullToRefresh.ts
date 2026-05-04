import { useState, useCallback, useRef, useEffect } from 'react';
import { useMobile } from '@/contexts/MobileContext';
import { ImpactStyle } from '@capacitor/haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { hapticFeedback } = useMobile();

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Trigger pull only when at top — supports both inner-container scroll and window scroll
    const container = containerRef.current;
    const atTop = container
      ? (container.scrollTop === 0 && (window.scrollY || document.documentElement.scrollTop) === 0)
      : true;
    if (atTop) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = (currentY.current - startY.current) / resistance;

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Haptic feedback when reaching threshold
      if (distance >= threshold && pullDistance < threshold) {
        hapticFeedback(ImpactStyle.Medium);
      }
    }
  }, [isRefreshing, threshold, resistance, pullDistance, hapticFeedback]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    
    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback(ImpactStyle.Heavy);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh, hapticFeedback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    shouldTrigger: pullDistance >= threshold,
  };
};
