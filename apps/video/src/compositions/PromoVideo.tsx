import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Brain, FileText, Keyboard, Mic, Plug, Users } from "lucide-react";
import { useVideoConfig } from "remotion";
import { CTAScene } from "./scenes/CTAScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { HeroScene } from "./scenes/HeroScene";
import { ModelsScene } from "./scenes/ModelsScene";
import { PlatformScene } from "./scenes/PlatformScene";

const FEATURES = [
  {
    icon: Users,
    title: "Shared Chats",
    description:
      "Collaborate with others in real-time. Multiple people can chat with AI together.",
  },
  {
    icon: FileText,
    title: "AI Rules",
    description: "Set custom instructions that shape how AI responds to you.",
  },
  {
    icon: Plug,
    title: "MCP Tools",
    description:
      "Connect external tools and services via Model Context Protocol.",
  },
  {
    icon: Brain,
    title: "User Memory",
    description:
      "AI remembers your preferences and context across conversations.",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your prompts naturally with built-in voice support.",
  },
  {
    icon: Keyboard,
    title: "Hotkeys",
    description:
      "Navigate and control the app efficiently with keyboard shortcuts.",
  },
];

export const PromoVideo = () => {
  const { fps } = useVideoConfig();

  const transitionDuration = Math.round(0.4 * fps);
  const heroLength = Math.round(2.5 * fps);
  const modelsLength = Math.round(2.5 * fps);
  const featureLength = Math.round(2 * fps);
  const platformLength = Math.round(2 * fps);
  const ctaLength = Math.round(2.5 * fps);

  return (
    <TransitionSeries>
      {/* Hero: Logo + Tagline */}
      <TransitionSeries.Sequence durationInFrames={heroLength}>
        <HeroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* AI Models showcase */}
      <TransitionSeries.Sequence durationInFrames={modelsLength}>
        <ModelsScene />
      </TransitionSeries.Sequence>

      {/* Individual feature scenes */}
      {FEATURES.map((feature) => (
        <>
          <TransitionSeries.Transition
            key={`transition-${feature.title}`}
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: transitionDuration })}
          />
          <TransitionSeries.Sequence
            durationInFrames={featureLength}
            key={feature.title}
          >
            <FeatureScene
              description={feature.description}
              icon={feature.icon}
              title={feature.title}
            />
          </TransitionSeries.Sequence>
        </>
      ))}

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Platform showcase */}
      <TransitionSeries.Sequence durationInFrames={platformLength}>
        <PlatformScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* CTA */}
      <TransitionSeries.Sequence durationInFrames={ctaLength}>
        <CTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
