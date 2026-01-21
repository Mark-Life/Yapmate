import {
  Brain,
  Cloud,
  Database,
  FileText,
  Globe,
  Keyboard,
  type LucideIcon,
  Mic,
  Plug,
  Users,
} from "lucide-react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { interFont, poppinsFont } from "../../components/fonts";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Brain,
    title: "Multiple AI Models",
    description: "Switch between models from top providers",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your prompts naturally",
  },
  {
    icon: Globe,
    title: "Web Search",
    description: "Real-time web search integration",
  },
  {
    icon: Users,
    title: "Multi-User Chats",
    description: "Collaborate with others on AI projects",
  },
  {
    icon: Plug,
    title: "MCP Tools",
    description: "Connect external tools and services",
  },
  {
    icon: Database,
    title: "User Memory",
    description: "Persistent memory across conversations",
  },
  {
    icon: Keyboard,
    title: "Hotkeys",
    description: "Efficient keyboard shortcuts",
  },
  {
    icon: FileText,
    title: "User Rules",
    description: "Custom rules for your messages",
  },
  {
    icon: Cloud,
    title: "Sync Everywhere",
    description: "Your history syncs across devices",
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15 },
    delay: index * 4,
  });

  const Icon = feature.icon;
  const isSmall = width <= 1080;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: isSmall ? 20 : 28,
        background: colors.bgCard,
        borderRadius: 16,
        border: `1px solid ${colors.bgCardHover}`,
        transform: `scale(${entrance})`,
        opacity: entrance,
        minWidth: isSmall ? 200 : 280,
        maxWidth: isSmall ? 280 : 340,
        flex: 1,
      }}
    >
      <Icon
        color={colors.primary}
        size={isSmall ? 36 : 44}
        style={{ marginBottom: 16 }}
      />
      <span
        style={{
          fontFamily: interFont,
          fontSize: isSmall ? 18 : 22,
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: 8,
        }}
      >
        {feature.title}
      </span>
      <span
        style={{
          fontFamily: interFont,
          fontSize: isSmall ? 14 : 16,
          color: colors.textSecondary,
          lineHeight: 1.4,
        }}
      >
        {feature.description}
      </span>
    </div>
  );
};

export const FeaturesScene = () => {
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
          padding: isSmall ? 32 : 60,
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
              gap: isVertical ? 32 : 36,
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
                  fontSize: isSmall ? 44 : 56,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Everything You Need
              </h2>
              <p
                style={{
                  fontFamily: interFont,
                  fontSize: isSmall ? 18 : 24,
                  color: colors.textSecondary,
                  margin: 0,
                }}
              >
                Powerful features to supercharge your AI conversations
              </p>
            </div>

            {/* Feature cards grid */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: isSmall ? 16 : 20,
                maxWidth: isVertical ? 700 : 1400,
              }}
            >
              {FEATURES.map((feature, index) => (
                <FeatureCard
                  feature={feature}
                  index={index}
                  key={feature.title}
                />
              ))}
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
