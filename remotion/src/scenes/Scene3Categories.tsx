import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CATEGORIES, C, playfair, inter } from "../theme";

export const Scene3Categories = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [4, 22], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90 }}>
      <div style={{ textAlign: "center", opacity: titleO, transform: `translateY(${titleY}px)` }}>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, color: C.orangeGlow, letterSpacing: 4, textTransform: "uppercase" }}>
          Every mood
        </div>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 84, color: C.white, marginTop: 12, lineHeight: 1.05 }}>
          Pick your
          <br />
          genre.
        </div>
      </div>

      <div
        style={{
          marginTop: 80,
          display: "flex",
          flexWrap: "wrap",
          gap: 26,
          justifyContent: "center",
          maxWidth: 880,
        }}
      >
        {CATEGORIES.map((cat, i) => {
          const s = spring({ frame: frame - 24 - i * 5, fps, config: { damping: 14, stiffness: 160 } });
          const o = interpolate(frame - 24 - i * 5, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const accent = i % 3 === 0;
          return (
            <div
              key={cat}
              style={{
                transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`,
                opacity: o,
                padding: "22px 42px",
                borderRadius: 60,
                fontFamily: inter,
                fontWeight: 700,
                fontSize: 40,
                color: accent ? "#fff" : C.white,
                background: accent
                  ? `linear-gradient(135deg, ${C.orange}, ${C.orangeGlow})`
                  : "rgba(255,255,255,0.08)",
                border: accent ? "none" : "2px solid rgba(255,255,255,0.16)",
                boxShadow: accent ? `0 12px 30px ${C.orange}55` : "none",
              }}
            >
              {cat}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
