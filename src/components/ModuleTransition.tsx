import { useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * ModuleTransition
 * ----------------
 * Premium, Facebook-style transition when the user switches between the primary
 * bottom-navigation modules. Strictly a presentation-layer enhancement:
 *   - Animates ONLY genuine module-to-module switches (not deep/internal pages).
 *   - Subtle horizontal slide + light fade, GPU accelerated (translate3d).
 *   - Respects `prefers-reduced-motion`.
 *   - Best-effort scroll-position restoration for the main modules so returning
 *     to a module lands where the user left it.
 *
 * It does NOT touch any module logic, data, queries, or routing configuration.
 */

// Order matches the bottom navigation + swipe order.
const MAIN_ROUTES = ["/", "/movion", "/novachat", "/bookshelf", "/groups", "/profile"];

// Map any path to its owning primary module index (-1 when it is not a module root).
const moduleIndexOf = (path: string): number => {
  if (path === "/") return 0;
  for (let i = 1; i < MAIN_ROUTES.length; i++) {
    const base = MAIN_ROUTES[i];
    if (path === base || path.startsWith(base + "/")) return i;
  }
  return -1;
};

// Persist scroll positions for the module roots across the app lifetime.
const scrollPositions = new Map<string, number>();

export const ModuleTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const ref = useRef<HTMLDivElement | null>(null);
  const prevModule = useRef<number>(moduleIndexOf(location.pathname));
  const prevPath = useRef<string>(location.pathname);

  useEffect(() => {
    const path = location.pathname;
    const curr = moduleIndexOf(path);
    const prev = prevModule.current;
    const leftPath = prevPath.current;

    // Save the scroll position of the module root we are leaving.
    if (MAIN_ROUTES.includes(leftPath) && leftPath !== path) {
      scrollPositions.set(leftPath, window.scrollY);
    }

    prevModule.current = curr;
    prevPath.current = path;

    // Restore scroll for module roots (best-effort, no-op for inner-scroll pages).
    if (MAIN_ROUTES.includes(path)) {
      const saved = scrollPositions.get(path) ?? 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, saved));
      });
    }

    // Animate only real switches between two different primary modules.
    const isModuleSwitch = curr !== -1 && prev !== -1 && curr !== prev;
    if (!isModuleSwitch) return;

    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const dir = curr > prev ? 1 : -1; // forward → slide in from the right
    el.style.willChange = "transform, opacity";
    const anim = el.animate(
      [
        { transform: `translate3d(${dir * 26}px, 0, 0)`, opacity: 0 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
      ],
      { duration: 270, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );
    const cleanup = () => {
      el.style.willChange = "";
    };
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  }, [location.pathname]);

  return <div ref={ref}>{children}</div>;
};
