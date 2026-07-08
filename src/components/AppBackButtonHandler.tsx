import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/**
 * AppBackButtonHandler
 * --------------------
 * Wires the Android hardware back button to a proper in-app navigation history
 * stack (Facebook / WhatsApp behavior) instead of instantly closing the app.
 *
 *   - Tracks how deep we are from the app launch entry using the router's
 *     navigation type (PUSH increments, POP decrements).
 *   - On hardware back: if there is history to walk, go back one entry
 *     (this naturally walks the real module-switch order). Only when we reach
 *     the launch entry does the app exit.
 *
 * Web / browser back is untouched — the native listener is only attached on
 * native platforms. No module, data, or routing logic is modified.
 */
export const AppBackButtonHandler = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const location = useLocation();
  const depth = useRef(0);

  // Maintain distance from the launch entry. Initial render is a POP and keeps
  // depth at 0, so the first screen is the exit point.
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
          if (depth.current > 0) {
            navigate(-1);
          } else {
            App.exitApp();
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
