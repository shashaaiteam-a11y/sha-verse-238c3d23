import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, playfair } from "../theme";

// Sha-Verse wordmark with an open-book glyph.
export const Logo = ({ size = 1, delay = 0 }: { size?: number; delay?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18 * size,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          width: 86 * size,
          height: 86 * size,
          borderRadius: 22 * size,
          background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 12px 30px ${C.blue}66`,
        }}
      >
        {/* open book glyph */}
        <svg width={50 * size} height={50 * size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5.5C10 4 6.5 3.8 4 4.6V19c2.5-.8 6-.6 8 .9 2-1.5 5.5-1.7 8-.9V4.6c-2.5-.8-6-.6-8 .9Z"
            fill="#fff"
          />
          <path d="M12 6.4v13.5" stroke={C.blue} strokeWidth="1.1" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: playfair,
            fontWeight: 900,
            fontSize: 64 * size,
            color: C.white,
            letterSpacing: -1,
          }}
        >
          Sha-Verse
        </span>
        <span
          style={{
            fontFamily: playfair,
            fontWeight: 600,
            fontSize: 26 * size,
            color: C.orangeGlow,
            letterSpacing: 6 * size,
            marginTop: 6 * size,
            textTransform: "uppercase",
          }}
        >
          Bookshelf
        </span>
      </div>
    </div>
  );
};
