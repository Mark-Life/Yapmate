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

export const ChatIntroScene = () => {
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

  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoRotation = interpolate(logoSpring, [0, 1], [-180, 0]);

  // Text animations
  const textDelay = 15;
  const textSpring = spring({
    frame: frame - textDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const subtitleDelay = 25;
  const subtitleSpring = spring({
    frame: frame - subtitleDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSmall ? 24 : 32,
          padding: isVertical ? 60 : 40,
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("yapmate-apple-2-dark-iOS-Default.png")}
          style={{
            width: isSmall ? 120 : 160,
            height: isSmall ? 120 : 160,
            borderRadius: isSmall ? 28 : 36,
            transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
            boxShadow: `0 20px 60px ${colors.primary}40`,
          }}
        />

        {/* Main text */}
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
              fontSize: isSmall ? 48 : 72,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "center",
            }}
          >
            Watch AI <span style={{ color: colors.primary }}>in Action</span>
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleSpring,
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 20 : 28,
              fontWeight: 400,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            One conversation. Multiple AI models.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
