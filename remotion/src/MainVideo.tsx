import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { PersistentBackground } from "./components/PersistentBackground";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Library } from "./scenes/Scene2Library";
import { Scene3Categories } from "./scenes/Scene3Categories";
import { Scene4Reader } from "./scenes/Scene4Reader";
import { Scene5Channels } from "./scenes/Scene5Channels";
import { Scene6Features } from "./scenes/Scene6Features";
import { Scene7CTA } from "./scenes/Scene7CTA";

const t = () => springTiming({ config: { damping: 200 }, durationInFrames: 23 });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 23 })} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene2Library />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t()} />

        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene3Categories />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 23 })} />

        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene4Reader />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5Channels />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 23 })} />

        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene6Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 23 })} />

        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
