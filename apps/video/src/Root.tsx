import { Composition, Folder } from "remotion";
import { PromoVideo } from "./compositions/PromoVideo";

export const RemotionRoot = () => (
  <Folder name="Yapmate">
    <Composition
      component={PromoVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1080}
      id="PromoVideo"
      width={1920}
    />
    <Composition
      component={PromoVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1080}
      id="PromoVideoSquare"
      width={1080}
    />
    <Composition
      component={PromoVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1920}
      id="PromoVideoVertical"
      width={1080}
    />
  </Folder>
);
