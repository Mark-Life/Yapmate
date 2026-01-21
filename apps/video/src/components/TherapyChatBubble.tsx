import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "./colors";
import { interFont } from "./fonts";

interface TherapyChatBubbleProps {
  message: string;
  sender: "partner1" | "partner2" | "ai";
  senderName: string;
  delay?: number;
  typewriter?: boolean;
  modelLogo?: string;
}

const senderColors = {
  partner1: colors.accent3, // Pink
  partner2: colors.secondary, // Orange
  ai: colors.bgCard, // Dark (AI)
};

const senderTextColors = {
  partner1: colors.bgDark,
  partner2: colors.bgDark,
  ai: colors.textPrimary,
};

export const TherapyChatBubble = ({
  message,
  sender,
  senderName,
  delay = 0,
  typewriter = false,
  modelLogo,
}: TherapyChatBubbleProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;
  const isUser = sender !== "ai";
  // AI and partner1 align left, partner2 aligns right (like user messages in web app)
  const alignLeft = sender === "partner1" || sender === "ai";

  // Entrance animation
  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const translateX = interpolate(
    entrance,
    [0, 1],
    [alignLeft ? -100 : 100, 0]
  );
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Typewriter effect for AI messages
  const visibleChars = typewriter
    ? Math.floor(
        interpolate(
          adjustedFrame,
          [15, 15 + message.length * 1.5],
          [0, message.length],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      )
    : message.length;

  const displayedMessage = message.slice(0, visibleChars);

  if (adjustedFrame < 0) return null;

  const bubbleColor = senderColors[sender];
  const textColor = senderTextColors[sender];

  const bubbleStyle: React.CSSProperties = {
    maxWidth: "95%",
    padding: "32px 40px",
    borderRadius: alignLeft ? "40px 40px 40px 12px" : "40px 40px 12px 40px",
    backgroundColor: bubbleColor,
    border: sender === "ai" ? `3px solid ${colors.bgCardHover}` : "none",
    fontFamily: interFont,
    fontSize: 42,
    lineHeight: 1.4,
    color: textColor,
    fontWeight: isUser ? 600 : 400,
    transform: `translateX(${translateX}px)`,
    opacity,
    boxShadow:
      sender === "ai"
        ? "0 10px 40px rgba(0,0,0,0.4)"
        : `0 10px 40px ${bubbleColor}40`,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: alignLeft ? "flex-start" : "flex-end",
        width: "100%",
        gap: 16,
      }}
    >
      {/* Sender label with avatar for AI */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: opacity * 0.9,
          marginLeft: alignLeft ? 16 : 0,
          marginRight: alignLeft ? 0 : 16,
        }}
      >
        {sender === "ai" && modelLogo && (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: colors.bgCardHover,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={modelLogo}
              style={{
                width: 36,
                height: 36,
                filter: "invert(1)",
              }}
            />
          </div>
        )}
        <span
          style={{
            fontFamily: interFont,
            fontSize: 32,
            color: sender === "ai" ? colors.textMuted : bubbleColor,
            fontWeight: 600,
          }}
        >
          {senderName}
        </span>
      </div>
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
