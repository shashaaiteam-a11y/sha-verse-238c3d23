type SwipeDebugState = {
  status: "blocked" | "triggered" | "ignored" | "started";
  reason?: string;
  target?: string;
  dx?: number;
  dy?: number;
};

let lockCount = 0;
let removeLockedTouchBlocker: (() => void) | null = null;

const getTargetLabel = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return "unknown";
  const id = target.id ? `#${target.id}` : "";
  const testId = target.dataset.testid ? `[data-testid=${target.dataset.testid}]` : "";
  const marker = target.dataset.noSwipeNav ? "[data-no-swipe-nav]" : "";
  return `${target.tagName.toLowerCase()}${id}${testId}${marker}.${Array.from(target.classList).slice(0, 3).join(".")}`;
};

export const lockSwipeNavigation = () => {
  lockCount += 1;
  document.body.dataset.swipeNavDisabled = "true";

  if (!removeLockedTouchBlocker) {
    const stopLockedTouch = (event: TouchEvent) => {
      if (!isSwipeNavigationLocked()) return;
      if ((event.target as HTMLElement | null)?.closest?.('[data-no-swipe-nav="true"]')) {
        publishSwipeDebug({ status: "blocked", reason: "locked-touch-capture" }, event.target);
        event.stopPropagation();
      }
    };

    window.addEventListener("touchstart", stopLockedTouch, { capture: true, passive: true });
    window.addEventListener("touchmove", stopLockedTouch, { capture: true, passive: true });
    window.addEventListener("touchend", stopLockedTouch, { capture: true, passive: true });

    removeLockedTouchBlocker = () => {
      window.removeEventListener("touchstart", stopLockedTouch, { capture: true });
      window.removeEventListener("touchmove", stopLockedTouch, { capture: true });
      window.removeEventListener("touchend", stopLockedTouch, { capture: true });
    };
  }

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      delete document.body.dataset.swipeNavDisabled;
      removeLockedTouchBlocker?.();
      removeLockedTouchBlocker = null;
    }
  };
};

export const isSwipeNavigationLocked = () =>
  lockCount > 0 || document.body.dataset.swipeNavDisabled === "true";

export const isSwipeDebugEnabled = () =>
  new URLSearchParams(window.location.search).has("swipeDebug") ||
  window.localStorage.getItem("swipeDebug") === "true";

export const publishSwipeDebug = (state: SwipeDebugState, target?: EventTarget | null) => {
  if (!isSwipeDebugEnabled()) return;
  window.dispatchEvent(
    new CustomEvent("swipe-navigation-debug", {
      detail: {
        ...state,
        target: state.target ?? getTargetLabel(target ?? null),
      },
    }),
  );
};

export type { SwipeDebugState };