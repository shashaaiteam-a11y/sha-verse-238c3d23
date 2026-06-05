import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { BookDetailScreen } from "../components/BookDetailScreen";
import { TapCursor } from "../components/TapCursor";
import { BOOKS } from "../theme";

export const Scene4Reader = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [40, 120], [0, 240], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const liked = frame >= 56;
  const saved = frame >= 86;
  return (
    <PhoneStage eyebrow="Step 3" title="Open any book" enterFrom="right">
      <BookDetailScreen sw={SCREEN_W} book={BOOKS[0]} scrollY={scrollY} liked={liked} saved={saved} />
      <TapCursor x={SCREEN_W * 0.78} y={120} at={52} />
      <TapCursor x={SCREEN_W * 0.88} y={120} at={82} />
    </PhoneStage>
  );
};
