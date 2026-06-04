import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BOOKS, C, playfair, inter } from "../theme";
import { BookCover } from "../components/BookCover";
import { Logo } from "../components/Logo";

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // fanned-out books behind
  const fanO = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fan = [
    { b: BOOKS[1], rot: -22, x: -340, y: 40 },
    { b: BOOKS[6], rot: -10, x: -180, y: -30 },
    { b: BOOKS[2], rot: 0, x: 0, y: -60 },
    { b: BOOKS[3], rot: 10, x: 180, y: -30 },
    { b: BOOKS[0], rot: 22, x: 340, y: 40 },
  ];

  const ctaS = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 150 } });
  const ctaScale = interpolate(ctaS, [0, 1], [0.7, 1]);
  const ctaO = interpolate(frame - 40, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const urlO = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });
  const glow = 0.6 + Math.sin(frame / 14) * 0.4;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* fanned books */}
      <div style={{ position: "absolute", top: 360, display: "flex", justifyContent: "center", opacity: fanO * 0.9 }}>
        {fan.map((f, i) => {
          const s = spring({ frame: frame - i * 4, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                transform: `translate(${f.x}px, ${f.y}px) rotate(${f.rot * s}deg) scale(${interpolate(s, [0, 1], [0.6, 1])})`,
              }}
            >
              <BookCover title={f.b.title} author={f.b.author} g={f.b.g} w={240} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 360, transform: `scale(${ctaScale})`, opacity: ctaO, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Logo size={1.1} delay={40} />

        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 92, color: C.white, marginTop: 60, textAlign: "center", lineHeight: 1.05 }}>
          Start reading
          <br />
          <span style={{ color: C.orangeGlow }}>today.</span>
        </div>

        <div
          style={{
            opacity: urlO,
            marginTop: 56,
            padding: "30px 70px",
            borderRadius: 70,
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
            boxShadow: `0 0 ${40 * glow}px ${C.blue}, 0 18px 40px ${C.blue}66`,
            fontFamily: inter,
            fontWeight: 800,
            fontSize: 48,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          sha-verse.com
        </div>

        <div style={{ opacity: urlO, marginTop: 34, fontFamily: inter, fontWeight: 500, fontSize: 34, color: C.mute }}>
          Read · Write · Share — all in one universe
        </div>
      </div>
    </AbsoluteFill>
  );
};
