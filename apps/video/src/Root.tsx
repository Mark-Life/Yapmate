import { Composition, Folder } from "remotion";
import { PromoVideo } from "./compositions/PromoVideo";

export const RemotionRoot = () => {
  return (
    <Folder name="Yapmate">
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="PromoVideoSquare"
        component={PromoVideo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="PromoVideoVertical"
        component={PromoVideo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </Folder>
  );
};
