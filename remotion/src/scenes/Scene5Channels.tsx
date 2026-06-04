import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, playfair, inter } from "../theme";
import { BookCover } from "../components/BookCover";

export const Scene5Channels = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  const cardS = spring({ frame: frame - 16, fps, config: { damping: 16, stiffness: 130 } });
  const cardScale = interpolate(cardS, [0, 1], [0.85, 1]);
  const cardO = interpolate(frame - 16, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // subscribe button "click"
  const subscribed = frame > 90;
  const btnPulse = subscribed ? interpolate(frame, [90, 100], [0.9, 1], { extrapolateRight: "clamp" }) : 1;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center", opacity: titleO, marginBottom: 70 }}>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 30, color: C.orangeGlow, letterSpacing: 4, textTransform: "uppercase" }}>
          Authors & Creators
        </div>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 78, color: C.white, marginTop: 12, lineHeight: 1.05 }}>
          Follow authors.
          <br />
          Publish your own.
        </div>
      </div>

      {/* author channel card */}
      <div
        style={{
          transform: `scale(${cardScale})`,
          opacity: cardO,
          width: 820,
          borderRadius: 36,
          background: "rgba(255,255,255,0.06)",
          border: "2px solid rgba(255,255,255,0.14)",
          padding: 48,
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.blue}, ${C.orange})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: playfair,
              fontWeight: 800,
              fontSize: 60,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            R
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 50, color: C.white }}>Rumi Reads</div>
            <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 30, color: C.mute, marginTop: 6 }}>
              42 books · 18.2k readers
            </div>
          </div>
          <div
            style={{
              transform: `scale(${btnPulse})`,
              padding: "20px 44px",
              borderRadius: 50,
              fontFamily: inter,
              fontWeight: 800,
              fontSize: 36,
              color: "#fff",
              background: subscribed ? "rgba(255,255,255,0.12)" : `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
              border: subscribed ? "2px solid rgba(255,255,255,0.25)" : "none",
              boxShadow: subscribed ? "none" : `0 12px 28px ${C.blue}66`,
            }}
          >
            {subscribed ? "Subscribed ✓" : "Subscribe"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
          {[
            { title: "The Calm Mind", author: "Rumi Reads", g: ["#10B981", "#14B8A6"] },
            { title: "Midnight Verses", author: "Rumi Reads", g: ["#1E293B", "#475569"] },
            { title: "The Art Within", author: "Rumi Reads", g: ["#9333EA", "#C084FC"] },
          ].map((b, i) => {
            const bs = spring({ frame: frame - 40 - i * 8, fps, config: { damping: 15 } });
            return (
              <div key={i} style={{ transform: `translateY(${interpolate(bs, [0, 1], [40, 0])}px)`, opacity: interpolate(frame - 40 - i * 8, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <BookCover title={b.title} author={b.author} g={b.g} w={210} />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
