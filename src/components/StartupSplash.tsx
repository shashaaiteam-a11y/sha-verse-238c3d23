import { useEffect, useState } from "react";
import logo from "@/assets/sha-verse-logo.jpeg";

/**
 * StartupSplash
 * Premium 5s cinematic brand intro overlay (silent). Renders above the app
 * while it hydrates, then fades out and unmounts.
 * Shows once per browser session (sessionStorage).
 */
const SESSION_KEY = "__sv_splash_shown__";
const TOTAL_MS = 5000;
const FADE_OUT_MS = 420;

export const StartupSplash = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const fadeAt = reduce ? 500 : TOTAL_MS - FADE_OUT_MS;
    const unmountAt = reduce ? 500 + FADE_OUT_MS : TOTAL_MS;

    const t1 = window.setTimeout(() => setLeaving(true), fadeAt);
    const t2 = window.setTimeout(() => setVisible(false), unmountAt);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "#0b0f1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.22,1,0.36,1)`,
        pointerEvents: leaving ? "none" : "auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <style>{`
        @keyframes sv-logo-in {
          0%   { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sv-breathe {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.035); }
        }
        @keyframes sv-glow-in {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes sv-glow-out {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sv-text-in {
          0%   { opacity: 0; transform: translateY(12px); letter-spacing: 0.24em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.08em; }
        }
        .sv-splash-stack {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .sv-splash-tagline {
          margin: 0;
          font-size: clamp(13px, 3.6vw, 18px);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-align: center;
          white-space: nowrap;
          color: rgba(226,236,255,0.92);
          text-shadow: 0 2px 18px rgba(96,165,250,0.45);
          opacity: 0;
          animation: sv-text-in 700ms cubic-bezier(0.22,1,0.36,1) 1000ms forwards;
          will-change: transform, opacity;
        }
        .sv-splash-logo {
          width: min(38vw, 148px);
          height: min(38vw, 148px);
          border-radius: 28%;
          object-fit: cover;
          opacity: 0;
          transform: scale(0.9);
          animation:
            sv-logo-in 600ms cubic-bezier(0.22,1,0.36,1) 200ms forwards,
            sv-breathe 4200ms ease-in-out 1500ms 1;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.6);
          will-change: transform, opacity;
        }

        .sv-splash-glow {
          position: absolute;
          width: min(90vw, 480px);
          height: min(90vw, 480px);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(96,165,250,0.35) 0%,
            rgba(96,165,250,0.12) 35%,
            rgba(96,165,250,0) 70%
          );
          opacity: 0;
          filter: blur(8px);
          animation:
            sv-glow-in 900ms ease-out 900ms forwards,
            sv-glow-out 700ms ease-in 4100ms forwards;
          will-change: opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .sv-splash-logo, .sv-splash-glow, .sv-splash-tagline {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <div className="sv-splash-glow" />
      <div className="sv-splash-stack">
        <img src={logo} alt="" className="sv-splash-logo" draggable={false} />
        <p className="sv-splash-tagline">SHA-VERSE: The Next Generation</p>
      </div>

    </div>
  );
};

export default StartupSplash;
