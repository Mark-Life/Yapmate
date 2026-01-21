import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./colors";
import { interFont } from "./fonts";

interface TypingIndicatorProps {
  delay?: number;
  duration?: number;
  modelName?: string;
  modelLogo?: string;
}

export const TypingIndicator = ({
  delay = 0,
  duration = 60,
  modelName,
  modelLogo,
}: TypingIndicatorProps) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const adjustedFrame = frame - delay;

  const isSmall = width <= 1080;

  if (adjustedFrame < 0 || adjustedFrame > duration) return null;

  const opacity = interpolate(
    adjustedFrame,
    [0, 5, duration - 5, duration],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        opacity,
      }}
    >
      {modelName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 8,
          }}
        >
          {modelLogo && (
            <img
              src={modelLogo}
              style={{
                width: isSmall ? 20 : 24,
                height: isSmall ? 20 : 24,
                filter: "invert(1)",
              }}
            />
          )}
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 14 : 16,
              color: colors.textMuted,
              fontWeight: 500,
            }}
          >
            {modelName}
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: isSmall ? "16px 24px" : "20px 32px",
          borderRadius: "24px 24px 24px 6px",
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.bgCardHover}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: isSmall ? 10 : 12,
              height: isSmall ? 10 : 12,
              borderRadius: "50%",
              backgroundColor: colors.primary,
              opacity: interpolate(
                Math.sin((adjustedFrame + i * 8) * 0.2),
                [-1, 1],
                [0.3, 1]
              ),
              transform: `translateY(${interpolate(
                Math.sin((adjustedFrame + i * 8) * 0.2),
                [-1, 1],
                [3, -3]
              )}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
