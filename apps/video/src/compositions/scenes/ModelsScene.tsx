import {
  AbsoluteFill,
  Img,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: "GPT-4o, o1, o3" },
  { id: "anthropic", name: "Anthropic", models: "Claude 4, Sonnet" },
  { id: "google", name: "Google", models: "Gemini 2.5 Pro" },
  { id: "deepseek", name: "DeepSeek", models: "R1, V3" },
  { id: "meta", name: "Meta", models: "Llama 4" },
  { id: "mistral", name: "Mistral", models: "Large, Medium" },
  { id: "xai", name: "xAI", models: "Grok 3" },
];

const ProviderCard = ({
  provider,
  index,
}: {
  provider: (typeof AI_PROVIDERS)[0];
  index: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12 },
    delay: index * 5,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: colors.bgCard,
        borderRadius: 16,
        border: `1px solid ${colors.bgCardHover}`,
        transform: `scale(${entrance}) translateY(${(1 - entrance) * 30}px)`,
        opacity: entrance,
        minWidth: 140,
      }}
    >
      <Img
        src={`https://models.dev/logos/${provider.id}.svg`}
        style={{
          width: 56,
          height: 56,
          marginBottom: 12,
          filter: "invert(1)",
        }}
      />
      <span
        style={{
          fontFamily: interFont,
          fontSize: 18,
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        {provider.name}
      </span>
      <span
        style={{
          fontFamily: interFont,
          fontSize: 13,
          color: colors.textMuted,
          textAlign: "center",
        }}
      >
        {provider.models}
      </span>
    </div>
  );
};

export const ModelsScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const titleEntrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const isVertical = height > width;
  const isSmall = width <= 1080;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: isSmall ? 24 : 40,
        }}
      >
        <Sequence
          durationInFrames={Number.POSITIVE_INFINITY}
          from={0}
          layout="none"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: isVertical ? 48 : 40,
              width: "100%",
            }}
          >
            {/* Title */}
            <div
              style={{
                textAlign: "center",
                opacity: titleEntrance,
                transform: `translateY(${(1 - titleEntrance) * 30}px)`,
              }}
            >
              <h2
                style={{
                  fontFamily: poppinsFont,
                  fontSize: isSmall ? 56 : 72,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                World's Best AI Models
              </h2>
              <p
                style={{
                  fontFamily: interFont,
                  fontSize: isSmall ? 24 : 28,
                  color: colors.textSecondary,
                  margin: 0,
                }}
              >
                Access models from leading AI providers — all in one place
              </p>
            </div>

            {/* Provider cards */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 20,
                maxWidth: isVertical ? 600 : 1200,
              }}
            >
              {AI_PROVIDERS.map((provider, index) => (
                <ProviderCard
                  index={index}
                  key={provider.id}
                  provider={provider}
                />
              ))}
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
