import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Home } from "./scenes/Scene2Library";
import { Scene3Categories } from "./scenes/Scene3Categories";
import { Scene4Reader } from "./scenes/Scene4Reader";
import { Scene5Channels } from "./scenes/Scene5Channels";
import { Scene6Features } from "./scenes/Scene6Features";
import { Scene7Upload } from "./scenes/Scene7Upload";
import { Scene7CTA } from "./scenes/Scene7CTA";

const T = 20;
const spring20 = () => springTiming({ config: { damping: 200 }, durationInFrames: T });
const lin = () => linearTiming({ durationInFrames: T });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={80}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={lin()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene2Home />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={spring20()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene3Categories />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={spring20()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Reader />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={spring20()} />

        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene5Channels />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={spring20()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene6Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={spring20()} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene7Upload />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={lin()} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
