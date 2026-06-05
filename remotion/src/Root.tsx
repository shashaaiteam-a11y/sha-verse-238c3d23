import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1030}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
