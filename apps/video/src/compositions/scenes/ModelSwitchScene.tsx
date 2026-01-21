import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { ChatBubble } from "../../components/ChatBubble";
import { ModelSelector } from "../../components/ModelSelector";
import { TypingIndicator } from "../../components/TypingIndicator";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

const MODELS = [
  { id: "anthropic", name: "Claude 4", logo: staticFile("assets/anthropic.svg") },
  { id: "openai", name: "GPT-4o", logo: staticFile("assets/openai.svg") },
  { id: "google", name: "Gemini 2.5", logo: staticFile("assets/google.svg") },
  { id: "deepseek", name: "DeepSeek R1", logo: staticFile("assets/deepseek.svg") },
];

export const ModelSwitchScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isSmall = width <= 1080;
  const isVertical = height > width;

  // Timeline:
  // 0-20: Title appears
  // 20-40: Model selector with Claude selected
  // 40-70: Dropdown expands
  // 70-100: GPT-4 gets selected
  // 100+: New response appears

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const expandStart = 40;
  const selectStart = 70;
  const responseStart = 100;
  const typingStart = 100;
  const typingDuration = 25;
  const responseDelay = 125;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSmall ? 32 : 48,
          padding: isVertical ? 40 : isSmall ? 40 : 80,
        }}
      >
        {/* Title */}
        <div
          style={{
            textAlign: "center",
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 36 : 52,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Switch Models{" "}
            <span style={{ color: colors.primary }}>Instantly</span>
          </span>
        </div>

        {/* Model selector */}
        <ModelSelector
          models={MODELS}
          selectedIndex={0}
          delay={20}
          expanded={frame >= expandStart}
          expandDelay={expandStart - 20}
          selectDelay={selectStart - 20}
          newSelectedIndex={1}
        />

        {/* Response preview */}
        <div
          style={{
            width: "100%",
            maxWidth: isVertical ? "100%" : isSmall ? 800 : 1000,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <TypingIndicator
            delay={typingStart}
            duration={typingDuration}
            modelName="GPT-4o"
            modelLogo={staticFile("assets/openai.svg")}
          />

          <ChatBubble
            message="'Think Beyond Limits' — bold and aspirational. Or try 'AI That Gets You' for a more personal touch."
            isUser={false}
            delay={responseDelay}
            typewriter={true}
            modelName="GPT-4o"
            modelLogo={staticFile("assets/openai.svg")}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
