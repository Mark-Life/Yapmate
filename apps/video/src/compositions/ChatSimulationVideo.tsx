import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { ChatCTAScene } from "./scenes/ChatCTAScene";
import { ChatDemoScene } from "./scenes/ChatDemoScene";
import { ChatIntroScene } from "./scenes/ChatIntroScene";
import { ModelSwitchScene } from "./scenes/ModelSwitchScene";
import { MultiModelScene } from "./scenes/MultiModelScene";

export const ChatSimulationVideo = () => {
  const { fps } = useVideoConfig();

  const transitionDuration = Math.round(0.5 * fps);

  // Scene durations
  const introLength = Math.round(2.5 * fps); // 2.5s - Logo + "Watch AI in action"
  const chatDemoLength = Math.round(6 * fps); // 6s - User message + AI typing + response
  const modelSwitchLength = Math.round(5.5 * fps); // 5.5s - Model switching demo
  const multiModelLength = Math.round(2.5 * fps); // 2.5s - All models showcase
  const ctaLength = Math.round(2.5 * fps); // 2.5s - Final CTA

  return (
    <TransitionSeries>
      {/* Intro: Logo + "Watch AI in action" */}
      <TransitionSeries.Sequence durationInFrames={introLength}>
        <ChatIntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Chat Demo: User sends message, AI responds */}
      <TransitionSeries.Sequence durationInFrames={chatDemoLength}>
        <ChatDemoScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Model Switch: Show switching between models */}
      <TransitionSeries.Sequence durationInFrames={modelSwitchLength}>
        <ModelSwitchScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Multi-model showcase: All AI models available */}
      <TransitionSeries.Sequence durationInFrames={multiModelLength}>
        <MultiModelScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* CTA: Start chatting */}
      <TransitionSeries.Sequence durationInFrames={ctaLength}>
        <ChatCTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
