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
import { interFont, poppinsFont } from "../../components/fonts";

export const PlatformScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const titleEntrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const webEntrance = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
  });

  const mobileEntrance = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15 },
  });

  const webX = interpolate(webEntrance, [0, 1], [-100, 0]);
  const mobileX = interpolate(mobileEntrance, [0, 1], [100, 0]);

  const isVertical = height > width;
  const isSmall = width <= 1080;

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: isSmall ? 40 : 80,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isVertical ? 32 : 40,
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
                fontSize: isSmall ? 48 : 56,
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Web & iOS
            </h2>
            <p
              style={{
                fontFamily: interFont,
                fontSize: isSmall ? 20 : 24,
                color: colors.textSecondary,
                margin: 0,
              }}
            >
              Same experience, synced everywhere
            </p>
          </div>

          {/* Screenshots */}
          <div
            style={{
              display: "flex",
              flexDirection: isVertical ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: isVertical ? 24 : 48,
            }}
          >
            {/* Web screenshot */}
            <div
              style={{
                opacity: webEntrance,
                transform: `translateX(${webX}px)`,
              }}
            >
              <Img
                src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-example-model-selection.png"
                style={{
                  width: isVertical ? "90%" : isSmall ? 500 : 700,
                  maxWidth: "100%",
                  borderRadius: 16,
                  boxShadow: `0 20px 60px ${colors.bgDark}aa`,
                  border: `1px solid ${colors.bgCardHover}`,
                }}
              />
            </div>

            {/* Mobile screenshot */}
            <div
              style={{
                opacity: mobileEntrance,
                transform: `translateX(${mobileX}px)`,
              }}
            >
              <Img
                src="https://esvxscqmjmnbktpyifcg.supabase.co/storage/v1/object/public/yapmate/website/about/yapmate-ios-markdown-render-small.jpg"
                style={{
                  width: isVertical ? 180 : isSmall ? 180 : 240,
                  borderRadius: 24,
                  boxShadow: `0 20px 60px ${colors.bgDark}aa`,
                  border: `1px solid ${colors.bgCardHover}`,
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
