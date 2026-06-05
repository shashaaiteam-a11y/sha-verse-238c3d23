import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  // tap position in px relative to the screen container
  x: number;
  y: number;
  // frame (within the scene) at which the tap lands
  at: number;
  size?: number;
}

// A finger-tap indicator: a soft circle that descends and a ripple on contact.
export const TapCursor = ({ x, y, at, size = 90 }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // approach: cursor eases in just before the tap
  const appear = interpolate(frame, [at - 18, at - 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const approach = spring({ frame: frame - (at - 18), fps, config: { damping: 16, stiffness: 90 } });
  const ty = interpolate(approach, [0, 1], [70, 0]);

  // press scale on contact
  const press = interpolate(frame, [at - 4, at, at + 6], [1, 0.78, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ripple after contact
  const rippleP = interpolate(frame, [at, at + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rippleScale = interpolate(rippleP, [0, 1], [0.2, 2.4]);
  const rippleOpacity = interpolate(rippleP, [0, 1], [0.5, 0]);

  // fade cursor out after tap
  const out = interpolate(frame, [at + 10, at + 28], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* ripple */}
      {rippleP > 0 && rippleP < 1 && (
        <div
          style={{
            position: "absolute",
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "rgba(37,99,235,0.35)",
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            zIndex: 80,
            pointerEvents: "none",
          }}
        />
      )}
      {/* finger circle */}
      <div
        style={{
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(20,20,30,0.28)",
          border: "3px solid rgba(255,255,255,0.85)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          opacity: appear * out,
          transform: `translateY(${ty}px) scale(${press})`,
          zIndex: 85,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
