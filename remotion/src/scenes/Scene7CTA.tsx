import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, inter, playfair, PROMO_BG, GRADIENT_PRIMARY } from "../theme";
import { BookOpen } from "lucide-react";

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 120 } });
  const scale = interpolate(s, [0, 1], [0.5, 1]);
  const tO = interpolate(frame, [16, 32], [0, 1], { extrapolateRight: "clamp" });
  const tY = interpolate(frame, [16, 34], [40, 0], { extrapolateRight: "clamp" });
  const urlO = interpolate(frame, [40, 56], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: PROMO_BG, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: -180, right: -140, width: 560, height: 560, borderRadius: "50%", background: "rgba(91,141,239,0.3)", filter: "blur(50px)" }} />
      <div style={{ position: "absolute", bottom: -200, left: -140, width: 540, height: 540, borderRadius: "50%", background: "rgba(255,90,31,0.18)", filter: "blur(50px)" }} />

      <div style={{ transform: `scale(${scale})`, width: 180, height: 180, borderRadius: "40px", background: GRADIENT_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(37,99,235,0.5)" }}>
        <BookOpen size={92} color="#fff" strokeWidth={2.2} />
      </div>

      <div style={{ opacity: tO, transform: `translateY(${tY}px)`, marginTop: 50, textAlign: "center" }}>
        <div style={{ fontFamily: playfair, fontWeight: 900, fontSize: 88, color: "#fff" }}>Sha-Verse</div>
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 40, color: "rgba(255,255,255,0.85)", marginTop: 8 }}>
          Read. Discover. Publish.
        </div>
      </div>

      <div style={{ opacity: urlO, marginTop: 56, padding: "22px 56px", borderRadius: 999, background: GRADIENT_PRIMARY, fontFamily: inter, fontWeight: 800, fontSize: 46, color: "#fff", boxShadow: "0 16px 40px rgba(37,99,235,0.45)" }}>
        sha-verse.com
      </div>
    </AbsoluteFill>
  );
};
