import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

/**
 * Module visibility context (keep-alive aware)
 * --------------------------------------------
 * The keep-alive shell keeps the six primary bottom-navigation modules mounted
 * at all times and only toggles their visibility. Because hidden modules stay
 * mounted, any timers / polling / realtime work they started keeps running in
 * the background.
 *
 * This context lets a module (opt-in, no forced changes) know whether it is the
 * currently visible module so it can PAUSE expensive background work while
 * hidden and RESUME it when shown again — WITHOUT changing business logic or
 * triggering data refetches.
 *
 * Notes on what is already handled automatically by the shell:
 *   - CSS animations/transitions and `requestAnimationFrame` visual work stop on
 *     their own because hidden layers use `display:none` (browsers do not run
 *     CSS animations on display:none subtrees).
 *   - Hidden layers are also marked `inert` + `aria-hidden`, so no focus,
 *     pointer, or accessibility work happens on them.
 *
 * What this context adds (opt-in):
 *   - JS timers (`setInterval`/`setTimeout` loops) and long-lived realtime
 *     subscriptions do NOT pause by themselves. A hook can read `useModuleVisible()`
 *     and gate its own polling/subscription without altering what it fetches.
 *
 * Modules NOT wrapped by the keep-alive shell (deep pages, auth, etc.) resolve
 * `useModuleVisible()` to `true`, so their behavior is completely unchanged.
 */

const ModuleVisibilityContext = createContext<boolean>(true);

export const ModuleVisibilityProvider = ({
  isVisible,
  children,
}: {
  isVisible: boolean;
  children: ReactNode;
}) => (
  <ModuleVisibilityContext.Provider value={isVisible}>{children}</ModuleVisibilityContext.Provider>
);

/**
 * Returns whether the calling module is currently the visible one.
 * Defaults to `true` when there is no keep-alive provider above (deep pages),
 * guaranteeing zero behavior change outside the six primary modules.
 */
export const useModuleVisible = (): boolean => useContext(ModuleVisibilityContext);

/**
 * Convenience: run `onHide` when the module becomes hidden and `onShow` when it
 * becomes visible again. Purely a pause/resume helper — it must not be used to
 * refetch data; use it to pause/resume timers, intervals, or continuous work.
 */
export const useModuleVisibilityChange = (handlers: {
  onShow?: () => void;
  onHide?: () => void;
}) => {
  const isVisible = useModuleVisible();
  const prev = useRef(isVisible);
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (prev.current === isVisible) return;
    prev.current = isVisible;
    if (isVisible) ref.current.onShow?.();
    else ref.current.onHide?.();
  }, [isVisible]);
};
