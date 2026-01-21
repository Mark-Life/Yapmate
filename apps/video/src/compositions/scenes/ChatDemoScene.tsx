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
import { TypingIndicator } from "../../components/TypingIndicator";
import { colors } from "../../components/colors";
import { interFont } from "../../components/fonts";

const CLAUDE_LOGO = staticFile("assets/anthropic.svg");

export const ChatDemoScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isSmall = width <= 1080;
  const isVertical = height > width;

  // Chat interface animation
  const interfaceSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // Timeline:
  // 0-15: Interface appears
  // 15-45: User message appears
  // 45-75: Typing indicator
  // 75+: AI response with typewriter

  const userMessageDelay = 15;
  const typingDelay = 45;
  const typingDuration = 30;
  const aiResponseDelay = 75;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isVertical ? 40 : isSmall ? 40 : 80,
        }}
      >
        {/* Chat container */}
        <div
          style={{
            width: "100%",
            maxWidth: isVertical ? "100%" : isSmall ? 900 : 1200,
            display: "flex",
            flexDirection: "column",
            gap: isSmall ? 20 : 28,
            opacity: interfaceSpring,
            transform: `translateY(${interpolate(interfaceSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          {/* Chat header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isSmall ? "12px 20px" : "16px 28px",
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              border: `1px solid ${colors.bgCardHover}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: isSmall ? 10 : 12,
                  height: isSmall ? 10 : 12,
                  borderRadius: "50%",
                  backgroundColor: colors.accent4,
                }}
              />
              <span
                style={{
                  fontFamily: interFont,
                  fontSize: isSmall ? 16 : 20,
                  fontWeight: 500,
                  color: colors.textSecondary,
                }}
              >
                New Chat
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={CLAUDE_LOGO}
                style={{
                  width: isSmall ? 20 : 24,
                  height: isSmall ? 20 : 24,
                  filter: "invert(1)",
                }}
              />
              <span
                style={{
                  fontFamily: interFont,
                  fontSize: isSmall ? 14 : 18,
                  fontWeight: 600,
                  color: colors.primary,
                }}
              >
                Claude 4
              </span>
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isSmall ? 20 : 28,
              padding: isSmall ? "24px" : "32px",
              backgroundColor: `${colors.bgCard}80`,
              borderRadius: 24,
              border: `1px solid ${colors.bgCardHover}`,
              minHeight: isVertical ? 400 : 300,
            }}
          >
            {/* User message */}
            <ChatBubble
              message="Help me write a creative tagline for my AI startup"
              isUser={true}
              delay={userMessageDelay}
            />

            {/* Typing indicator */}
            <TypingIndicator
              delay={typingDelay}
              duration={typingDuration}
              modelName="Claude 4"
              modelLogo={CLAUDE_LOGO}
            />

            {/* AI response */}
            <ChatBubble
              message="Here are some creative taglines: 'Intelligence, Amplified.' or 'Where Ideas Meet AI.' — which direction resonates with your brand?"
              isUser={false}
              delay={aiResponseDelay}
              typewriter={true}
              modelName="Claude 4"
              modelLogo={CLAUDE_LOGO}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
