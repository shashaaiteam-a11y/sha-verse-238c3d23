import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneFrame } from "./PhoneFrame";
import { C, inter, PROMO_BG } from "../theme";

export const PHONE_W = 760;
export const SCREEN_W = 720; // usable inner screen width passed to screens as `sw`
export const PHONE_TOP = 300;

interface Props {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  enterFrom?: "right" | "left" | "scale";
}

// Branded stage: gradient background, top caption, and the phone showing live app UI.
export const PhoneStage = ({ eyebrow, title, children, enterFrom = "scale" }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const capO = interpolate(frame, [4, 18], [0, 1], { extrapolateRight: "clamp" });
  const capY = interpolate(frame, [4, 22], [40, 0], { extrapolateRight: "clamp" });

  const s = spring({ frame, fps, config: { damping: 20, stiffness: 110 } });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const slideX = interpolate(s, [0, 1], [enterFrom === "right" ? 220 : enterFrom === "left" ? -220 : 0, 0]);
  const float = Math.sin(frame / 42) * 6;

  return (
    <AbsoluteFill style={{ background: PROMO_BG }}>
      {/* soft glow accents */}
      <div style={{ position: "absolute", top: -200, right: -160, width: 600, height: 600, borderRadius: "50%", background: "rgba(91,141,239,0.25)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: -220, left: -160, width: 560, height: 560, borderRadius: "50%", background: "rgba(255,90,31,0.16)", filter: "blur(40px)" }} />

      {/* caption */}
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", opacity: capO, transform: `translateY(${capY}px)`, padding: "0 80px" }}>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 30, letterSpacing: 5, textTransform: "uppercase", color: C.accentGlow }}>{eyebrow}</div>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 64, color: "#fff", marginTop: 12, lineHeight: 1.05 }}>{title}</div>
      </div>

      {/* phone */}
      <div style={{ position: "absolute", top: PHONE_TOP, left: "50%", transform: `translateX(-50%) translateX(${slideX}px) scale(${scale}) translateY(${float}px)` }}>
        <PhoneFrame w={PHONE_W}>{children}</PhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
