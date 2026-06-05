import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { ReaderScreen } from "../components/ReaderScreen";
import { TapCursor } from "../components/TapCursor";

export const Scene5Channels = () => {
  const frame = useCurrentFrame();
  const theme = frame < 80 ? "light" : frame < 110 ? "sepia" : "dark";
  const showSettings = frame >= 50 && frame < 150;
  const bookmarked = frame >= 158;
  const progress = interpolate(frame, [0, 190], [22, 41]);
  const fontScale = 1;
  // settings sheet bottom area ~ y 1180-1430 inside screen
  return (
    <PhoneStage eyebrow="Step 4" title="Read your way" enterFrom="right">
      <ReaderScreen sw={SCREEN_W} theme={theme as any} progress={progress} fontScale={fontScale} bookmarked={bookmarked} showSettings={showSettings} />
      {/* tap settings icon */}
      <TapCursor x={SCREEN_W * 0.93} y={150} at={46} />
      {/* tap Sepia */}
      <TapCursor x={SCREEN_W * 0.5} y={1330} at={76} />
      {/* tap Dark */}
      <TapCursor x={SCREEN_W * 0.82} y={1330} at={106} />
      {/* tap bookmark */}
      <TapCursor x={SCREEN_W * 0.62} y={150} at={154} />
    </PhoneStage>
  );
};
