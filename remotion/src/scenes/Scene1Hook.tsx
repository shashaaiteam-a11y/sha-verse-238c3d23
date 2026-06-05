import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, inter, playfair, PROMO_BG, GRADIENT_PRIMARY } from "../theme";
import { BookOpen } from "lucide-react";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoScale = interpolate(logoS, [0, 1], [0.4, 1]);
  const ring = interpolate(frame, [0, 40], [0, 360]);

  const t1O = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: "clamp" });
  const t1Y = interpolate(frame, [18, 36], [40, 0], { extrapolateRight: "clamp" });
  const t2O = interpolate(frame, [34, 50], [0, 1], { extrapolateRight: "clamp" });
  const t2Y = interpolate(frame, [34, 52], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: PROMO_BG, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: -180, right: -140, width: 560, height: 560, borderRadius: "50%", background: "rgba(91,141,239,0.3)", filter: "blur(50px)" }} />
      <div style={{ position: "absolute", bottom: -200, left: -140, width: 540, height: 540, borderRadius: "50%", background: "rgba(255,90,31,0.18)", filter: "blur(50px)" }} />

      <div style={{ transform: `scale(${logoScale})`, position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "8px solid transparent", borderTopColor: C.accentGlow, borderRightColor: C.primaryGlow, transform: `rotate(${ring}deg)`, opacity: 0.85 }} />
        <div style={{ width: 200, height: 200, borderRadius: "44px", background: GRADIENT_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(37,99,235,0.5)" }}>
          <BookOpen size={104} color="#fff" strokeWidth={2.2} />
        </div>
      </div>

      <div style={{ opacity: t1O, transform: `translateY(${t1Y}px)`, marginTop: 56, textAlign: "center" }}>
        <div style={{ fontFamily: playfair, fontWeight: 900, fontSize: 96, color: "#fff" }}>Sha-Verse</div>
        <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 52, letterSpacing: 8, textTransform: "uppercase", color: C.accentGlow, marginTop: 4 }}>Bookshelf</div>
      </div>

      <div style={{ opacity: t2O, transform: `translateY(${t2Y}px)`, marginTop: 40, fontFamily: inter, fontWeight: 500, fontSize: 38, color: "rgba(255,255,255,0.82)" }}>
        Har kahani, aapke haath mein.
      </div>
    </AbsoluteFill>
  );
};
