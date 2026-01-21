import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "./colors";
import { interFont } from "./fonts";

interface Model {
  id: string;
  name: string;
  logo: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedIndex: number;
  delay?: number;
  expanded?: boolean;
  expandDelay?: number;
  selectDelay?: number;
  newSelectedIndex?: number;
}

export const ModelSelector = ({
  models,
  selectedIndex,
  delay = 0,
  expanded = false,
  expandDelay = 0,
  selectDelay = 0,
  newSelectedIndex,
}: ModelSelectorProps) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const adjustedFrame = frame - delay;
  const isSmall = width <= 1080;

  if (adjustedFrame < 0) return null;

  // Entrance animation
  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 20, stiffness: 150 },
  });

  // Expansion animation
  const expandProgress = expanded
    ? spring({
        frame: adjustedFrame - expandDelay,
        fps,
        config: { damping: 15, stiffness: 100 },
      })
    : 0;

  // Selection animation
  const selectProgress =
    selectDelay > 0 && newSelectedIndex !== undefined
      ? spring({
          frame: adjustedFrame - selectDelay,
          fps,
          config: { damping: 20, stiffness: 150 },
        })
      : 0;

  const currentSelected = interpolate(
    selectProgress,
    [0, 1],
    [selectedIndex, newSelectedIndex ?? selectedIndex]
  );

  const selectedModel = models[Math.round(currentSelected)];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: entrance,
        transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
      }}
    >
      {/* Selected model button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: isSmall ? "12px 20px" : "14px 24px",
          borderRadius: 16,
          backgroundColor: colors.bgCard,
          border: `2px solid ${colors.primary}50`,
          boxShadow: `0 0 30px ${colors.primary}20`,
        }}
      >
        <img
          src={selectedModel.logo}
          style={{
            width: isSmall ? 24 : 28,
            height: isSmall ? 24 : 28,
            filter: "invert(1)",
          }}
        />
        <span
          style={{
            fontFamily: interFont,
            fontSize: isSmall ? 16 : 20,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          {selectedModel.name}
        </span>
        <svg
          width={isSmall ? 16 : 20}
          height={isSmall ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: `rotate(${interpolate(expandProgress, [0, 1], [0, 180])}deg)`,
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke={colors.textSecondary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {expanded && expandProgress > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: 8,
            borderRadius: 16,
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.bgCardHover}`,
            opacity: expandProgress,
            transform: `translateY(${interpolate(expandProgress, [0, 1], [-20, 0])}px)`,
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          {models.map((model, index) => {
            const isSelected = Math.round(currentSelected) === index;
            return (
              <div
                key={model.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: isSmall ? "10px 16px" : "12px 20px",
                  borderRadius: 12,
                  backgroundColor: isSelected ? `${colors.primary}20` : "transparent",
                  border: isSelected ? `1px solid ${colors.primary}40` : "1px solid transparent",
                }}
              >
                <img
                  src={model.logo}
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
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? colors.primary : colors.textSecondary,
                  }}
                >
                  {model.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
