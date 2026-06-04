import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BOOKS, C, playfair, inter } from "../theme";
import { BookCover } from "../components/BookCover";

export const Scene2Library = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [4, 24], [50, 0], { extrapolateRight: "clamp" });

  // slow upward drift of the whole grid
  const gridY = interpolate(frame, [0, 180], [60, -120]);

  const grid = [...BOOKS, ...BOOKS.slice(0, 3)];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 150,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
          opacity: titleO,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, color: C.orangeGlow, letterSpacing: 4, textTransform: "uppercase" }}>
          Discover
        </div>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 78, color: C.white, marginTop: 10 }}>
          Thousands of books.
        </div>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 78, color: C.white, lineHeight: 1 }}>
          One library.
        </div>
      </div>

      {/* dark overlay top to let title breathe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 560,
          background: `linear-gradient(${C.ink}EE, transparent)`,
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 600,
          left: 0,
          right: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 40,
          padding: "0 70px",
          transform: `translateY(${gridY}px)`,
        }}
      >
        {grid.map((b, i) => {
          const s = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 16, stiffness: 120 } });
          const o = interpolate(frame - 10 - i * 4, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "center",
                transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                opacity: o,
              }}
            >
              <BookCover title={b.title} author={b.author} g={b.g} w={280} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
