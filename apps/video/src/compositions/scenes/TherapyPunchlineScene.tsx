import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { poppinsFont, interFont } from "../../components/fonts";

export const TherapyPunchlineScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text animation
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Price animation (comes in after)
  const priceDelay = 25;
  const priceSpring = spring({
    frame: frame - priceDelay,
    fps,
    config: { damping: 8, stiffness: 100 },
  });

  // Price bounce for emphasis
  const priceBounce = spring({
    frame: frame - priceDelay - 15,
    fps,
    config: { damping: 5, stiffness: 200 },
  });

  // Strikethrough animation for "Couples Therapy: $200/hr"
  const strikeDelay = 10;
  const strikeProgress = interpolate(
    frame - strikeDelay,
    [0, 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtitle
  const subtitleDelay = 50;
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
          gap: 56,
          padding: 50,
        }}
      >
        {/* Crossed out therapy price */}
        <div
          style={{
            opacity: textSpring,
            transform: `translateY(${interpolate(textSpring, [0, 1], [30, 0])}px)`,
            position: "relative",
          }}
        >
          <span
            style={{
              fontFamily: interFont,
              fontSize: 40,
              fontWeight: 500,
              color: colors.textMuted,
            }}
          >
            Couples Therapy: $200/hr
          </span>
          {/* Strikethrough line */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              height: 4,
              backgroundColor: colors.accent3,
              width: `${strikeProgress * 100}%`,
              transform: "translateY(-50%)",
            }}
          />
        </div>

        {/* Main punchline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: priceSpring,
            transform: `scale(${interpolate(priceBounce, [0, 1], [1, 1.05])}) translateY(${interpolate(priceSpring, [0, 1], [40, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: 60,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Yapmate:
          </span>
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: 100,
              fontWeight: 800,
              color: colors.primary,
              textAlign: "center",
              textShadow: `0 0 50px ${colors.primary}60`,
            }}
          >
            $7/month
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleSpring,
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: interFont,
              fontSize: 36,
              fontWeight: 500,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            Better than couples therapy.*
          </span>
          <span
            style={{
              fontFamily: interFont,
              fontSize: 20,
              fontWeight: 400,
              color: colors.textMuted,
              textAlign: "center",
            }}
          >
            *Results may vary. AI is not a licensed therapist.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
