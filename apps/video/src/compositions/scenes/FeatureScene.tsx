import type { LucideIcon } from "lucide-react";
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

type FeatureSceneProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const FeatureScene = ({
  icon: Icon,
  title,
  description,
}: FeatureSceneProps) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const cardScale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const cardY = interpolate(cardScale, [0, 1], [60, 0]);

  const iconScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 15 },
  });

  const textOpacity = spring({
    frame: frame - 12,
    fps,
    config: { damping: 200 },
  });

  const textY = interpolate(textOpacity, [0, 1], [20, 0]);

  const isSmall = width <= 1080;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: isSmall ? 32 : 40,
        }}
      >
        {/* Feature card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: isSmall ? 56 : 80,
            background: colors.bgCard,
            borderRadius: 32,
            border: `2px solid ${colors.primary}40`,
            transform: `scale(${cardScale}) translateY(${cardY}px)`,
            maxWidth: isSmall ? 600 : 800,
            boxShadow: `0 0 80px ${colors.primary}20`,
          }}
        >
          {/* Icon */}
          <div
            style={{
              transform: `scale(${iconScale})`,
              marginBottom: 40,
            }}
          >
            <Icon
              color={colors.primary}
              size={isSmall ? 96 : 120}
              strokeWidth={1.5}
            />
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 52 : 64,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 20,
              textAlign: "center",
              opacity: textOpacity,
              transform: `translateY(${textY}px)`,
            }}
          >
            {title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 26 : 32,
              color: colors.textSecondary,
              margin: 0,
              textAlign: "center",
              lineHeight: 1.5,
              opacity: textOpacity,
              transform: `translateY(${textY}px)`,
            }}
          >
            {description}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
