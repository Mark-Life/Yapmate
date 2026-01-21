import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors } from "./colors";

export const Background = () => {
  const frame = useCurrentFrame();

  // Subtle gradient animation
  const gradientPosition = interpolate(frame, [0, 300], [0, 100], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(
            ellipse at ${50 + Math.sin(gradientPosition * 0.02) * 20}% ${50 + Math.cos(gradientPosition * 0.015) * 15}%,
            ${colors.primary}18 0%,
            transparent 50%
          ),
          radial-gradient(
            ellipse at ${70 + Math.cos(gradientPosition * 0.018) * 15}% ${30 + Math.sin(gradientPosition * 0.012) * 20}%,
            ${colors.secondary}12 0%,
            transparent 40%
          ),
          ${colors.bgDark}
        `,
      }}
    />
  );
};
