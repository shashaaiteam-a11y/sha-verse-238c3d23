import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { ChannelScreen } from "../components/ChannelScreen";
import { TapCursor } from "../components/TapCursor";
import { BOOKS } from "../theme";

export const Scene6Features = () => {
  const frame = useCurrentFrame();
  const subscribed = frame >= 58;
  const scrollY = interpolate(frame, [70, 135], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <PhoneStage eyebrow="Step 5" title="Follow your authors" enterFrom="right">
      <ChannelScreen sw={SCREEN_W} subscribed={subscribed} scrollY={scrollY} books={BOOKS.slice(5, 11)} />
      {/* tap Subscribe button */}
      <TapCursor x={SCREEN_W * 0.32} y={760} at={54} />
    </PhoneStage>
  );
};
