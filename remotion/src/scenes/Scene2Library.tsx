import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { HomeScreen } from "../components/HomeScreen";
import { TapCursor } from "../components/TapCursor";

export const Scene2Home = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [30, 120], [0, 460], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <PhoneStage eyebrow="Step 1" title="Enter the Bookshelf" enterFrom="scale">
      <HomeScreen sw={SCREEN_W} scrollY={scrollY} activeTab="Discover" selectedCategory="All" />
      <TapCursor x={SCREEN_W * 0.5} y={760} at={26} />
    </PhoneStage>
  );
};
