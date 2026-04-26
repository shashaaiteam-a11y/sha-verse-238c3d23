import { useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const MAIN_ROUTES = ["/", "/movion", "/novachat", "/bookshelf", "/groups", "/profile"];
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_Y = 80;

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);

  const currentIndex = MAIN_ROUTES.indexOf(location.pathname);
  const isMainRoute = currentIndex !== -1;

  const isInsideHorizontalScroller = (target: EventTarget | null): boolean => {
    let el = target as HTMLElement | null;
    while (el && el !== document.body) {
      // Explicit opt-out marker
      if (el.dataset && el.dataset.noSwipeNav === "true") return true;
      const style = window.getComputedStyle(el);
      const overflowX = style.overflowX;
      const canScrollX =
        (overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay") &&
        el.scrollWidth > el.clientWidth + 1;
      if (canScrollX) return true;
      el = el.parentElement;
    }
    return false;
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMainRoute) return;
    if (isInsideHorizontalScroller(e.target)) {
      touchStart.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    swiping.current = false;
  }, [isMainRoute]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMainRoute || !touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = Math.abs(touch.clientY - touchStart.current.y);
    touchStart.current = null;

    if (dy > SWIPE_MAX_Y || Math.abs(dx) < SWIPE_THRESHOLD) return;

    if (dx < 0 && currentIndex < MAIN_ROUTES.length - 1) {
      // Swipe left → next module
      navigate(MAIN_ROUTES[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      // Swipe right → previous module
      navigate(MAIN_ROUTES[currentIndex - 1]);
    }
  }, [isMainRoute, currentIndex, navigate]);

  return { onTouchStart, onTouchEnd };
}
