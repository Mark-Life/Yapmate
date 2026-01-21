import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { poppinsFont } from "../../components/fonts";

export const HeroScene = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const logoRotation = interpolate(logoScale, [0, 1], [-180, 0]);

  // Text animations (staggered)
  const titleOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  const titleY = interpolate(titleOpacity, [0, 1], [40, 0]);

  const subtitleOpacity = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
  });

  const subtitleY = interpolate(subtitleOpacity, [0, 1], [30, 0]);

  // Calculate responsive sizes - larger for better visibility
  const isSmallWidth = width <= 1080;
  const logoSize = isSmallWidth ? 180 : 220;
  const titleSize = isSmallWidth ? 72 : 96;
  const highlightSize = isSmallWidth ? 84 : 112;
  const subtitleSize = isSmallWidth ? 28 : 32;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          }}
        >
          <Img
            src={staticFile("yapmate-apple-2-dark-iOS-Default.png")}
            style={{
              width: logoSize,
              height: logoSize,
            }}
          />
        </div>

        {/* Main tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <h1
            style={{
              fontFamily: poppinsFont,
              fontSize: titleSize,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
              textAlign: "center",
            }}
          >
            All Top AI Models.
          </h1>
          <h1
            style={{
              fontFamily: poppinsFont,
              fontSize: highlightSize,
              fontWeight: 800,
              color: colors.primary,
              margin: 0,
              textAlign: "center",
            }}
          >
            One App.
          </h1>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: poppinsFont,
            fontSize: subtitleSize,
            fontWeight: 400,
            color: colors.textSecondary,
            margin: 0,
            textAlign: "center",
            maxWidth: "80%",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          Chat with GPT, Claude, Gemini, and more. No vendor lock-in.
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
