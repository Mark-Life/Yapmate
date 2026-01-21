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

export const TherapyCTAScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          gap: 56,
          padding: 48,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("yapmate-apple-2-dark-iOS-Default.png")}
          style={{
            width: 200,
            height: 200,
            borderRadius: 48,
            transform: `scale(${logoSpring})`,
            opacity: logoSpring,
            boxShadow: `0 24px 80px ${colors.primary}50`,
          }}
        />

        {/* Main CTA text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            opacity: textSpring,
            transform: `translateY(${interpolate(textSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: 80,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "center",
            }}
          >
            Chat <span style={{ color: colors.primary }}>Together</span>
          </span>
          <span
            style={{
              fontFamily: interFont,
              fontSize: 40,
              fontWeight: 400,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            Share chats.
            <br />
            Collaborate with AI.
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
              gap: 20,
              padding: "32px 64px",
              backgroundColor: colors.primary,
              borderRadius: 28,
              boxShadow: `0 16px 60px ${colors.primary}50`,
            }}
          >
            <span
              style={{
                fontFamily: poppinsFont,
                fontSize: 44,
                fontWeight: 700,
                color: colors.bgDark,
              }}
            >
              yapmate.com
            </span>
            <svg
              width={44}
              height={44}
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

        {/* Feature highlight */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(frame, [35, 50], [0, 0.8], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            backgroundColor: colors.accent3 + "15",
            padding: "18px 36px",
            borderRadius: 20,
            border: `2px solid ${colors.accent3}30`,
          }}
        >
          <span style={{ fontSize: 32 }}>👥</span>
          <span
            style={{
              fontFamily: interFont,
              fontSize: 32,
              color: colors.accent3,
              fontWeight: 500,
            }}
          >
            Shared Chats now available
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
