import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, playfair, inter } from "../theme";
import { PhoneFrame } from "../components/PhoneFrame";

const THEMES = [
  { bg: "#FFFFFF", text: "#2A2118", sub: "#9A9285", chip: "#F1ECE2", name: "Light" },
  { bg: "#F4ECD8", text: "#5B4636", sub: "#A0876A", chip: "#E8DCC8", name: "Sepia" },
  { bg: "#16181D", text: "#E6E6E6", sub: "#8A8F99", chip: "#262A31", name: "Dark" },
];

const LINES = [12, 13, 11, 13, 9, 12, 13, 10, 13, 12, 8];

const ReaderScreen = ({ themeIdx, fontScale, progress }: { themeIdx: number; fontScale: number; progress: number }) => {
  const t = THEMES[themeIdx];
  return (
    <div style={{ width: "100%", height: "100%", background: t.bg, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "70px 34px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, border: `3px solid ${t.sub}` }} />
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 22, color: t.sub }}>{t.name} mode</div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.orange }} />
      </div>
      {/* content */}
      <div style={{ padding: "10px 40px", flex: 1 }}>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 40 * fontScale, color: t.text, lineHeight: 1.1, marginBottom: 24 }}>
          Chapter Four
        </div>
        {LINES.map((wl, i) => (
          <div
            key={i}
            style={{
              height: 16 * fontScale,
              width: `${wl * 7.4}%`,
              background: t.text,
              opacity: 0.82,
              borderRadius: 6,
              marginBottom: 18 * fontScale,
            }}
          />
        ))}
      </div>
      {/* progress bar */}
      <div style={{ padding: "16px 40px 40px" }}>
        <div style={{ height: 8, borderRadius: 6, background: t.chip, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: C.blue, borderRadius: 6 }} />
        </div>
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 18, color: t.sub, marginTop: 12, textAlign: "center" }}>
          {Math.round(progress)}% · resume anytime
        </div>
      </div>
    </div>
  );
};

const Callout = ({ frame, fps, delay, top, side, label }: { frame: number; fps: number; delay: number; top: number; side: "left" | "right"; label: string }) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 150 } });
  const o = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(s, [0, 1], [side === "left" ? -60 : 60, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top,
        [side]: 60,
        transform: `translateX(${x}px)`,
        opacity: o,
        padding: "20px 32px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.08)",
        border: "2px solid rgba(255,255,255,0.16)",
        backdropFilter: "none",
        fontFamily: inter,
        fontWeight: 700,
        fontSize: 34,
        color: C.white,
        maxWidth: 320,
      }}
    >
      {label}
    </div>
  );
};

export const Scene4Reader = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // theme switches: light (0-70), sepia (70-120), dark (120+)
  const themeIdx = frame < 70 ? 0 : frame < 120 ? 1 : 2;
  // font size pulses up subtly mid-scene
  const fontScale = interpolate(frame, [80, 110], [1, 1.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progress = interpolate(frame, [0, 180], [18, 64]);

  const phoneS = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const phoneScale = interpolate(phoneS, [0, 1], [0.85, 1]);
  const float = Math.sin(frame / 36) * 10;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: playfair, fontWeight: 800, fontSize: 72, color: C.white }}>
          An immersive reader.
        </div>
      </div>

      <div style={{ transform: `scale(${phoneScale}) translateY(${float}px)`, marginTop: 60 }}>
        <PhoneFrame w={440}>
          <ReaderScreen themeIdx={themeIdx} fontScale={fontScale} progress={progress} />
        </PhoneFrame>
      </div>

      <Callout frame={frame} fps={fps} delay={26} top={520} side="left" label="Light · Sepia · Dark" />
      <Callout frame={frame} fps={fps} delay={50} top={900} side="right" label="Adjust font & zoom" />
      <Callout frame={frame} fps={fps} delay={74} top={1300} side="left" label="Bookmarks & auto-resume" />
    </AbsoluteFill>
  );
};
