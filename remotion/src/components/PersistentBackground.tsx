import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";

// Warm dark gradient with drifting soft orbs + subtle paper grain.
export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 80) * 30;
  const drift2 = Math.cos(frame / 100) * 40;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 90% at 50% -10%, ${C.ink2} 0%, ${C.ink} 55%, #060B1E 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -200 + drift,
          left: -150 + drift2,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.blue}55 0%, transparent 65%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -250 - drift,
          right: -180 + drift,
          width: 760,
          height: 760,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.orange}40 0%, transparent 65%)`,
          filter: "blur(50px)",
        }}
      />
      {/* faint grid lines */}
      <AbsoluteFill
        style={{
          opacity: 0.06,
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "90px 90px",
        }}
      />
    </AbsoluteFill>
  );
};
