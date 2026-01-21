import { Composition, Folder } from "remotion";
import { ChatSimulationVideo } from "./compositions/ChatSimulationVideo";
import { CouplesTherapyVideo } from "./compositions/CouplesTherapyVideo";
import { PromoVideo } from "./compositions/PromoVideo";

export const RemotionRoot = () => (
  <Folder name="Yapmate">
    {/* Original Promo Video */}
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

    {/* Chat Simulation Video */}
    <Composition
      component={ChatSimulationVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1080}
      id="ChatSimulation"
      width={1920}
    />
    <Composition
      component={ChatSimulationVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1080}
      id="ChatSimulationSquare"
      width={1080}
    />
    <Composition
      component={ChatSimulationVideo}
      defaultProps={{}}
      durationInFrames={540}
      fps={30}
      height={1920}
      id="ChatSimulationVertical"
      width={1080}
    />

    {/* Couples Therapy Video (Vertical Only) */}
    <Composition
      component={CouplesTherapyVideo}
      defaultProps={{}}
      durationInFrames={450}
      fps={30}
      height={1920}
      id="CouplesTherapyVertical"
      width={1080}
    />
  </Folder>
);
