import { useEffect, useRef, useState } from "react";
import logo from "@/assets/sha-verse-logo.jpeg";

/**
 * StartupSplash
 * Premium 3s brand intro overlay. Renders above the app while it hydrates,
 * then fades out and unmounts. Does not block loading — the app mounts and
 * initialises behind the overlay in parallel.
 *
 * Shows once per browser session (sessionStorage). Respects prefers-reduced-motion.
 */
const SESSION_KEY = "__sv_splash_shown__";
const TOTAL_MS = 3000;
const FADE_OUT_MS = 320;

const playStartupChime = () => {
  try {
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    // If the browser blocks autoplay, resume() will reject — we ignore silently.
    const start = ctx.currentTime + 0.02;
    const notes: Array<[number, number, number]> = [
      // [freq, startOffset, duration]
      [660, 0.0, 0.28],
      [990, 0.09, 0.42],
    ];
    notes.forEach(([freq, offset, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, start + offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + dur + 0.02);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* silent — muted device or blocked autoplay */
  }
};

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
  const played = useRef(false);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (!played.current && !reduce) {
      played.current = true;
      playStartupChime();
    }

    const fadeAt = reduce ? 400 : TOTAL_MS - FADE_OUT_MS;
    const unmountAt = reduce ? 400 + FADE_OUT_MS : TOTAL_MS;

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
        // account for Android status bar / notch
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
        .sv-splash-logo {
          width: min(38vw, 148px);
          height: min(38vw, 148px);
          border-radius: 28%;
          object-fit: cover;
          opacity: 0;
          transform: scale(0.9);
          animation:
            sv-logo-in 600ms cubic-bezier(0.22,1,0.36,1) 200ms forwards,
            sv-breathe 2400ms ease-in-out 1500ms 1;
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
            sv-glow-in 800ms ease-out 1000ms forwards,
            sv-glow-out 500ms ease-in 2400ms forwards;
          will-change: opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .sv-splash-logo, .sv-splash-glow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <div className="sv-splash-glow" />
      <img src={logo} alt="" className="sv-splash-logo" draggable={false} />
    </div>
  );
};

export default StartupSplash;
