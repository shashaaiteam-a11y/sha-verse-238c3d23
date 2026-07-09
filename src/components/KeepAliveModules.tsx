import { ReactNode, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { moduleStack, MODULE_ROOTS } from "@/lib/navigation/moduleStack";
import { ModuleVisibilityProvider } from "@/lib/navigation/moduleVisibility";

/**
 * KeepAliveModules
 * ----------------
 * True keep-alive for the six primary modules (Facebook-style):
 *   - Each module is mounted the FIRST time it is visited and then kept mounted.
 *   - Switching modules only toggles visibility — modules are never remounted, so
 *     their full UI state is preserved (local component state, drafts, open tabs,
 *     filters, playback state, and scroll positions of internal scroll areas).
 *   - Window-scroll positions are additionally saved/restored per module for
 *     modules that scroll the window instead of an internal container.
 *   - Module ⇄ module switches animate BOTH layers simultaneously (outgoing
 *     slides out while incoming slides in) using the Web Animations API. Deep
 *     pages are handled by the normal router and never trigger this animation.
 *
 * This is a presentation/navigation-only shell. It does not touch any module
 * logic, data, queries, Supabase, auth, or unrelated components.
 */

interface ModuleDef {
  path: string;
  element: ReactNode;
}

interface KeepAliveModulesProps {
  modules: ModuleDef[];
}

// Persist window-scroll positions for module roots across the app lifetime.
const scrollByPath = new Map<string, number>();

const TRANSITION_MS = 280;
const EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";

const LayerLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

export const KeepAliveModules = ({ modules }: KeepAliveModulesProps) => {
  const location = useLocation();
  const activePath = MODULE_ROOTS.includes(location.pathname as (typeof MODULE_ROOTS)[number])
    ? location.pathname
    : null;

  const [mounted, setMounted] = useState<string[]>(() => (activePath ? [activePath] : []));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevActive = useRef<string | null>(activePath);
  const transitioning = useRef(false);

  // Fresh mount → reset the dedicated module stack to the current base.
  useEffect(() => {
    moduleStack.reset(activePath ?? "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount the active module on first visit (keep-alive: never unmount).
  useEffect(() => {
    if (activePath && !mounted.includes(activePath)) {
      setMounted((prev) => (prev.includes(activePath) ? prev : [...prev, activePath]));
    }
  }, [activePath, mounted]);

  // Record forward module switches in the dedicated stack (consecutive-deduped).
  useEffect(() => {
    if (activePath) moduleStack.push(activePath);
  }, [activePath]);

  // Transition effect (runs BEFORE the visibility-sync effect below).
  useLayoutEffect(() => {
    const from = prevActive.current;
    const to = activePath;

    if (to === from) return;
    // Wait until the incoming module is actually mounted in the DOM.
    if (to && !mounted.includes(to)) return;

    // Save the outgoing module's window scroll.
    if (from) scrollByPath.set(from, window.scrollY);
    prevActive.current = to;

    const restoreScroll = () => {
      if (!to) return;
      const y = scrollByPath.get(to) ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, y));
    };

    const container = containerRef.current;
    const fromEl = from ? layerRefs.current[from] : null;
    const toEl = to ? layerRefs.current[to] : null;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const canAnimate =
      !reduceMotion &&
      !!container &&
      !!from &&
      !!to &&
      !!fromEl &&
      !!toEl &&
      typeof toEl.animate === "function";

    if (!canAnimate) {
      restoreScroll();
      return;
    }

    const dir =
      MODULE_ROOTS.indexOf(to as (typeof MODULE_ROOTS)[number]) >
      MODULE_ROOTS.indexOf(from as (typeof MODULE_ROOTS)[number])
        ? 1
        : -1;

    transitioning.current = true;

    const viewportH = window.innerHeight;
    container!.style.position = "relative";
    container!.style.overflow = "hidden";
    container!.style.height = `${viewportH}px`;
    container!.style.pointerEvents = "none";

    [fromEl!, toEl!].forEach((el) => {
      el.style.display = "block";
      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
      el.style.width = "100%";
      el.style.willChange = "transform";
    });

    const outAnim = fromEl!.animate(
      [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${-dir * 100}%,0,0)` }],
      { duration: TRANSITION_MS, easing: EASING, fill: "forwards" },
    );
    const inAnim = toEl!.animate(
      [{ transform: `translate3d(${dir * 100}%,0,0)` }, { transform: "translate3d(0,0,0)" }],
      { duration: TRANSITION_MS, easing: EASING, fill: "forwards" },
    );

    let finished = 0;
    const onDone = () => {
      if (++finished < 2) return;

      // Reset layer styles back to normal flow.
      [fromEl!, toEl!].forEach((el) => {
        el.style.position = "";
        el.style.top = "";
        el.style.left = "";
        el.style.width = "";
        el.style.willChange = "";
        el.style.transform = "";
      });
      container!.style.position = "";
      container!.style.overflow = "";
      container!.style.height = "";
      container!.style.pointerEvents = "";

      fromEl!.style.display = "none";
      toEl!.style.display = "";

      transitioning.current = false;
      restoreScroll();
    };

    outAnim.onfinish = onDone;
    outAnim.oncancel = onDone;
    inAnim.onfinish = onDone;
    inAnim.oncancel = onDone;
  }, [activePath, mounted]);

  // Visibility sync — keeps exactly the active module visible when NOT animating.
  useLayoutEffect(() => {
    if (transitioning.current) return;
    for (const m of modules) {
      const el = layerRefs.current[m.path];
      if (!el) continue;
      el.style.display = m.path === activePath ? "" : "none";
    }
  });

  return (
    <div ref={containerRef}>
      {modules
        .filter((m) => mounted.includes(m.path))
        .map((m) => (
          <div
            key={m.path}
            ref={(el) => {
              layerRefs.current[m.path] = el;
            }}
            style={{ display: m.path === activePath ? undefined : "none" }}
          >
            <Suspense fallback={<LayerLoader />}>{m.element}</Suspense>
          </div>
        ))}
    </div>
  );
};
