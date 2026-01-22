import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

export const TherapyIntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heart icon animation
  const heartSpring = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const heartScale = interpolate(heartSpring, [0, 1], [0, 1]);
  const heartRotate = interpolate(heartSpring, [0, 1], [-20, 0]);

  // Crack animation (appears after heart)
  const crackDelay = 20;
  const crackSpring = spring({
    frame: frame - crackDelay,
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  // Text animations
  const textDelay = 30;
  const textSpring = spring({
    frame: frame - textDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const subtitleDelay = 45;
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
          gap: 48,
          padding: 60,
        }}
      >
        {/* Cracked Heart Emoji */}
        <div
          style={{
            fontSize: 160,
            transform: `scale(${heartScale}) rotate(${heartRotate}deg)`,
            filter: `drop-shadow(0 10px 30px ${colors.accent3}60)`,
          }}
        >
          {crackSpring > 0.5 ? "💔" : "❤️"}
        </div>

        {/* Main text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: textSpring,
            transform: `translateY(${interpolate(textSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: 72,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Relationship{" "}
            <span style={{ color: colors.accent3 }}>Problems?</span>
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
              fontSize: 36,
              fontWeight: 400,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            We've got a solution...
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
