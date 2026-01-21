import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../../components/Background";
import { colors } from "../../components/colors";
import { poppinsFont } from "../../components/fonts";

export const CTAScene = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const textOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  const textY = interpolate(textOpacity, [0, 1], [30, 0]);

  const buttonScale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15 },
  });

  const isSmall = width <= 1080;

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
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src="https://yapmate.com/YAP.svg"
            style={{
              width: isSmall ? 100 : 120,
              height: isSmall ? 100 : 120,
            }}
          />
        </div>

        {/* CTA Text */}
        <div
          style={{
            textAlign: "center",
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          <h2
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 48 : 64,
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 16,
            }}
          >
            Ready to Chat?
          </h2>
          <p
            style={{
              fontFamily: poppinsFont,
              fontSize: isSmall ? 20 : 24,
              color: colors.textSecondary,
              margin: 0,
            }}
          >
            Start Yapping with the world's best AI models
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            transform: `scale(${buttonScale})`,
            opacity: buttonScale,
          }}
        >
          <div
            style={{
              background: colors.primary,
              padding: "16px 48px",
              borderRadius: 12,
              fontFamily: poppinsFont,
              fontSize: isSmall ? 20 : 24,
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            yapmate.com
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
