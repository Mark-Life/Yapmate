import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { TherapyChatScene } from "./scenes/TherapyChatScene";
import { TherapyCTAScene } from "./scenes/TherapyCTAScene";
import { TherapyIntroScene } from "./scenes/TherapyIntroScene";
import { TherapyPunchlineScene } from "./scenes/TherapyPunchlineScene";

export const CouplesTherapyVideo = () => {
  const { fps } = useVideoConfig();

  const transitionDuration = Math.round(0.4 * fps);

  // Scene durations (total ~15s)
  const introLength = Math.round(2.5 * fps); // 2.5s - Broken heart + "Relationship Problems?"
  const chatLength = Math.round(7 * fps); // 7s - The funny chat exchange
  const punchlineLength = Math.round(3 * fps); // 3s - "$7/month" reveal
  const ctaLength = Math.round(2.5 * fps); // 2.5s - Final CTA

  return (
    <TransitionSeries>
      {/* Intro: Broken heart + "Relationship Problems?" */}
      <TransitionSeries.Sequence durationInFrames={introLength}>
        <TherapyIntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Chat: Partners arguing + AI mediating */}
      <TransitionSeries.Sequence durationInFrames={chatLength}>
        <TherapyChatScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Punchline: "$7/month - Better than couples therapy" */}
      <TransitionSeries.Sequence durationInFrames={punchlineLength}>
        <TherapyPunchlineScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* CTA: Yapmate branding */}
      <TransitionSeries.Sequence durationInFrames={ctaLength}>
        <TherapyCTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
