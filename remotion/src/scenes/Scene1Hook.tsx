import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, playfair, inter } from "../theme";
import { Logo } from "../components/Logo";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineIn = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const taglineY = interpolate(lineIn, [0, 1], [40, 0]);
  const taglineO = interpolate(frame, [8, 24], [0, 1], { extrapolateRight: "clamp" });

  const sub = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <Logo size={1.05} delay={0} />

      <div
        style={{
          marginTop: 90,
          transform: `translateY(${taglineY}px)`,
          opacity: taglineO,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontWeight: 800,
            fontSize: 96,
            color: C.white,
            lineHeight: 1.08,
          }}
        >
          Har kahani,
          <br />
          <span style={{ color: C.orangeGlow }}>aapke haath mein.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 44,
          opacity: sub,
          fontFamily: inter,
          fontWeight: 500,
          fontSize: 38,
          color: C.mute,
          letterSpacing: 1,
        }}
      >
        Sha-Verse Bookshelf · Read anywhere
      </div>
    </AbsoluteFill>
  );
};
