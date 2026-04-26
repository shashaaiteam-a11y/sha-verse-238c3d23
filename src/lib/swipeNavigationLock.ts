type SwipeDebugState = {
  status: "blocked" | "triggered" | "ignored" | "started";
  reason?: string;
  target?: string;
  dx?: number;
  dy?: number;
};

let lockCount = 0;

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

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      delete document.body.dataset.swipeNavDisabled;
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