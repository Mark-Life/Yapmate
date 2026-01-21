import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "./colors";
import { interFont } from "./fonts";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  delay?: number;
  typewriter?: boolean;
  modelName?: string;
  modelLogo?: string;
}

export const ChatBubble = ({
  message,
  isUser,
  delay = 0,
  typewriter = false,
  modelName,
  modelLogo,
}: ChatBubbleProps) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const adjustedFrame = frame - delay;
  const isSmall = width <= 1080;

  // Entrance animation
  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const translateX = interpolate(entrance, [0, 1], [isUser ? 100 : -100, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Typewriter effect for AI messages
  const visibleChars = typewriter
    ? Math.floor(
        interpolate(
          adjustedFrame,
          [10, 10 + message.length * 1.2],
          [0, message.length],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      )
    : message.length;

  const displayedMessage = message.slice(0, visibleChars);

  if (adjustedFrame < 0) return null;

  const bubbleStyle: React.CSSProperties = {
    maxWidth: isSmall ? "85%" : "70%",
    padding: isSmall ? "16px 20px" : "20px 28px",
    borderRadius: isUser ? "24px 24px 6px 24px" : "24px 24px 24px 6px",
    backgroundColor: isUser ? colors.primary : colors.bgCard,
    border: isUser ? "none" : `1px solid ${colors.bgCardHover}`,
    fontFamily: interFont,
    fontSize: isSmall ? 22 : 28,
    lineHeight: 1.5,
    color: isUser ? colors.bgDark : colors.textPrimary,
    fontWeight: isUser ? 600 : 400,
    transform: `translateX(${translateX}px)`,
    opacity,
    boxShadow: isUser
      ? `0 4px 20px ${colors.primary}40`
      : "0 4px 20px rgba(0,0,0,0.3)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        width: "100%",
        gap: 8,
      }}
    >
      {!isUser && modelName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: opacity * 0.8,
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
      <div style={bubbleStyle}>
        {displayedMessage}
        {typewriter && visibleChars < message.length && (
          <span
            style={{
              opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              color: colors.primary,
            }}
          >
            |
          </span>
        )}
      </div>
    </div>
  );
};
