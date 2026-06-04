import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={942}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
