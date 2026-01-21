import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";
import { TherapyChatBubble } from "../../components/TherapyChatBubble";

export const TherapyChatScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // "Shared Chat" badge animation
  const badgeSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 40,
          paddingTop: 100,
          gap: 48,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            opacity: headerSpring,
            transform: `translateY(${interpolate(headerSpring, [0, 1], [-20, 0])}px)`,
          }}
        >
          {/* Shared Chat Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              backgroundColor: colors.primary + "20",
              padding: "20px 36px",
              borderRadius: 32,
              border: `3px solid ${colors.primary}40`,
              opacity: badgeSpring,
              transform: `scale(${interpolate(badgeSpring, [0, 1], [0.8, 1])})`,
            }}
          >
            <span style={{ fontSize: 36 }}>👥</span>
            <span
              style={{
                fontFamily: interFont,
                fontSize: 32,
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              Shared Chat
            </span>
          </div>

          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: 56,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Alex & Sam
          </span>
        </div>

        {/* Chat messages container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 40,
            flex: 1,
            justifyContent: "center",
            paddingBottom: 40,
          }}
        >
          {/* Partner 1 message */}
          <TherapyChatBubble
            message="You never listen to me! 😤"
            sender="partner1"
            senderName="Alex"
            delay={20}
          />

          {/* Partner 2 message */}
          <TherapyChatBubble
            message="I'm literally HERE! In the same chat! 🙄"
            sender="partner2"
            senderName="Sam"
            delay={55}
          />

          {/* AI response */}
          <TherapyChatBubble
            message="I sense some tension here. Let's try a breathing exercise... Just kidding. You're both valid. 🧘‍♀️"
            sender="ai"
            senderName="Claude"
            modelLogo={staticFile("assets/claude-logo.svg")}
            delay={100}
            typewriter
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
