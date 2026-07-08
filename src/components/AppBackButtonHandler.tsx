import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { moduleStack, isModuleRoot } from "@/lib/navigation/moduleStack";

/**
 * AppBackButtonHandler
 * --------------------
 * Wires the Android hardware back button to Facebook-style behavior:
 *
 *   1. On a DEEP page inside a module → normal router back (navigate(-1)) so the
 *      existing internal navigation is untouched.
 *   2. On a primary MODULE root → walk backwards through the dedicated module
 *      history stack (independent of browser history).
 *   3. Only when we reach the base entry (Home) does the app actually exit.
 *
 * The listener is attached only on native platforms — web/browser back is left
 * completely untouched. `@capacitor/app` is required here because there is no
 * other way to intercept the Android hardware back button; it is a Capacitor
 * plugin, not an animation library.
 */
export const AppBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();

  const pathRef = useRef(location.pathname);
  const depth = useRef(0); // distance from launch entry, for deep-page safety.

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (navType === "PUSH") depth.current += 1;
    else if (navType === "POP") depth.current = Math.max(0, depth.current - 1);
    // REPLACE leaves depth unchanged.
  }, [location.key, navType]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let remove: (() => void) | undefined;

    import("@capacitor/app")
      .then(({ App }) => {
        if (cancelled) return;
        App.addListener("backButton", () => {
          const path = pathRef.current;

          if (isModuleRoot(path)) {
            // Walk the dedicated module history stack.
            const prev = moduleStack.back();
            if (prev && prev !== path) {
              navigate(prev);
            } else {
              App.exitApp();
            }
          } else {
            // Deep page — normal router back, exit only if nothing behind.
            if (depth.current > 0) {
              navigate(-1);
            } else {
              App.exitApp();
            }
          }
        }).then((handle) => {
          if (cancelled) {
            handle.remove();
            return;
          }
          remove = () => handle.remove();
        });
      })
      .catch(() => {
        /* @capacitor/app unavailable — ignore */
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [navigate]);

  return null;
};
