import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, playfair, inter } from "../theme";

const FEATURES = [
  { label: "PDF & EPUB", sub: "Read any format", icon: "doc" },
  { label: "Upload Books", sub: "Share your work", icon: "up" },
  { label: "Bookmarks", sub: "Never lose a page", icon: "mark" },
  { label: "Smart Search", sub: "Find any title", icon: "search" },
  { label: "Rate & Review", sub: "Join the talk", icon: "star" },
  { label: "Track Progress", sub: "Resume instantly", icon: "chart" },
];

const Icon = ({ name }: { name: string }) => {
  const c = "#fff";
  const sw = 2.2;
  return (
    <svg width={54} height={54} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {name === "doc" && (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>)}
      {name === "up" && (<><path d="M12 19V6" /><path d="M5 12l7-7 7 7" /><path d="M5 21h14" /></>)}
      {name === "mark" && (<path d="M6 3h12v18l-6-4-6 4z" />)}
      {name === "search" && (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>)}
      {name === "star" && (<path d="M12 3l2.9 5.9 6.1.9-4.4 4.3 1 6.1L12 17.8 6.4 20.2l1-6.1L3 9.8l6.1-.9z" />)}
      {name === "chart" && (<><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 4-6" /></>)}
    </svg>
  );
};

export const Scene6Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleO = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [4, 22], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center", opacity: titleO, transform: `translateY(${titleY}px)`, marginBottom: 80 }}>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 84, color: C.white, lineHeight: 1.05 }}>
          Everything a
          <br />
          reader needs.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, width: 900 }}>
        {FEATURES.map((f, i) => {
          const s = spring({ frame: frame - 18 - i * 7, fps, config: { damping: 15, stiffness: 150 } });
          const o = interpolate(frame - 18 - i * 7, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={f.label}
              style={{
                transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                opacity: o,
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "34px 36px",
                borderRadius: 28,
                background: "rgba(255,255,255,0.06)",
                border: "2px solid rgba(255,255,255,0.12)",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 24,
                  background: i % 2 === 0 ? `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})` : `linear-gradient(135deg, ${C.orange}, ${C.orangeGlow})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={f.icon} />
              </div>
              <div>
                <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 42, color: C.white }}>{f.label}</div>
                <div style={{ fontFamily: inter, fontWeight: 500, fontSize: 28, color: C.mute, marginTop: 4 }}>{f.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
