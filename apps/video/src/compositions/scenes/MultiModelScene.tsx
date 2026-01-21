import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

const MODELS = [
  { id: "anthropic", name: "Claude", logo: staticFile("assets/anthropic.svg"), color: "#D97757" },
  { id: "openai", name: "GPT-4o", logo: staticFile("assets/openai.svg"), color: "#10A37F" },
  { id: "google", name: "Gemini", logo: staticFile("assets/google.svg"), color: "#4285F4" },
  { id: "deepseek", name: "DeepSeek", logo: staticFile("assets/deepseek.svg"), color: "#0066FF" },
  { id: "meta", name: "Llama", logo: staticFile("assets/meta.svg"), color: "#0668E1" },
  { id: "mistral", name: "Mistral", logo: staticFile("assets/mistral.svg"), color: "#F54E42" },
];

export const MultiModelScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isSmall = width <= 1080;
  const isVertical = height > width;

  // Title animation
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
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
          gap: isSmall ? 40 : 60,
          padding: isVertical ? 40 : isSmall ? 40 : 80,
        }}
      >
        {/* Title */}
        <div
          style={{
            textAlign: "center",
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 36 : 56,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            All Your AI.{" "}
            <span style={{ color: colors.primary }}>One Place.</span>
          </span>
        </div>

        {/* Model cards grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: isSmall ? 16 : 24,
            maxWidth: isVertical ? "100%" : 1000,
          }}
        >
          {MODELS.map((model, index) => {
            const cardSpring = spring({
              frame: frame - 10 - index * 4,
              fps,
              config: { damping: 12, stiffness: 100 },
            });

            const isHighlighted = Math.floor((frame - 30) / 15) % MODELS.length === index;
            const highlightPulse = isHighlighted
              ? interpolate(Math.sin(frame * 0.3), [-1, 1], [1, 1.08])
              : 1;

            return (
              <div
                key={model.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: isSmall ? "20px 28px" : "28px 40px",
                  backgroundColor: isHighlighted
                    ? `${model.color}20`
                    : colors.bgCard,
                  borderRadius: 20,
                  border: isHighlighted
                    ? `2px solid ${model.color}60`
                    : `1px solid ${colors.bgCardHover}`,
                  opacity: cardSpring,
                  transform: `
                    scale(${interpolate(cardSpring, [0, 1], [0.8, 1]) * highlightPulse})
                    translateY(${interpolate(cardSpring, [0, 1], [20, 0])}px)
                  `,
                  boxShadow: isHighlighted
                    ? `0 0 40px ${model.color}30`
                    : "0 4px 20px rgba(0,0,0,0.2)",
                  transition: "border 0.2s, background-color 0.2s",
                }}
              >
                <img
                  src={model.logo}
                  style={{
                    width: isSmall ? 36 : 48,
                    height: isSmall ? 36 : 48,
                    filter: "invert(1)",
                  }}
                />
                <span
                  style={{
                    fontFamily: interFont,
                    fontSize: isSmall ? 16 : 20,
                    fontWeight: 600,
                    color: isHighlighted ? model.color : colors.textPrimary,
                  }}
                >
                  {model.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [40, 55], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          <span
            style={{
              fontFamily: interFont,
              fontSize: isSmall ? 18 : 24,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            No vendor lock-in. Switch anytime.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
