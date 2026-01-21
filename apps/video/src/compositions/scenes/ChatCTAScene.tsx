import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

export const ChatCTAScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isSmall = width <= 1080;
  const isVertical = height > width;

  // Logo animation
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Text animation
  const textSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Button animation
  const buttonSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Pulse effect on button
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [1, 1.03]);

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSmall ? 28 : 40,
          padding: isVertical ? 60 : 40,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("yapmate-apple-2-dark-iOS-Default.png")}
          style={{
            width: isSmall ? 100 : 130,
            height: isSmall ? 100 : 130,
            borderRadius: isSmall ? 24 : 30,
            transform: `scale(${logoSpring})`,
            opacity: logoSpring,
            boxShadow: `0 20px 60px ${colors.primary}40`,
          }}
        />

        {/* Main CTA text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isSmall ? 12 : 16,
            opacity: textSpring,
            transform: `translateY(${interpolate(textSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 44 : 64,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "center",
            }}
          >
            Start{" "}
            <span style={{ color: colors.primary }}>Chatting</span>
          </span>
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 20 : 26,
              fontWeight: 400,
              color: colors.textSecondary,
              textAlign: "center",
              maxWidth: isSmall ? 400 : 600,
            }}
          >
            All top AI models. One beautiful app.
          </span>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonSpring,
            transform: `scale(${interpolate(buttonSpring, [0, 1], [0.8, 1]) * pulse})`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isSmall ? "18px 36px" : "22px 48px",
              backgroundColor: colors.primary,
              borderRadius: 16,
              boxShadow: `0 8px 40px ${colors.primary}50`,
            }}
          >
            <span
              style={{
                fontFamily: poppinsFont,
                fontSize: isSmall ? 22 : 28,
                fontWeight: 700,
                color: colors.bgDark,
              }}
            >
              yapmate.com
            </span>
            <svg
              width={isSmall ? 24 : 28}
              height={isSmall ? 24 : 28}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14m-6-6l6 6-6 6"
                stroke={colors.bgDark}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Platform badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isSmall ? 16 : 24,
            opacity: interpolate(frame, [35, 50], [0, 0.7], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 14 : 18,
              color: colors.textMuted,
            }}
          >
            Web
          </span>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: colors.textMuted,
            }}
          />
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 14 : 18,
              color: colors.textMuted,
            }}
          >
            iOS
          </span>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: colors.textMuted,
            }}
          />
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 14 : 18,
              color: colors.textMuted,
            }}
          >
            Coming soon: Android
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
