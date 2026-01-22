import {
  GlassContainer,
  GlassView,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

/** Check liquid glass availability once at module load */
const hasLiquidGlass = isLiquidGlassAvailable();

type GlassWrapperProps = {
  children: ReactNode;
  style?: ComponentProps<typeof GlassView>["style"];
  tintColor?: string;
  glassEffectStyle?: ComponentProps<typeof GlassView>["glassEffectStyle"];
};

/**
 * Wrapper that renders GlassView when available, View with bg-background otherwise
 */
export const GlassWrapper = ({
  children,
  style,
  tintColor,
  glassEffectStyle = "clear",
}: GlassWrapperProps) =>
  hasLiquidGlass ? (
    <GlassView
      glassEffectStyle={glassEffectStyle}
      isInteractive={true}
      style={style}
      tintColor={tintColor}
    >
      {children}
    </GlassView>
  ) : (
    <View className="border border-border bg-background" style={style}>
      {children}
    </View>
  );

type GlassContainerWrapperProps = {
  children: ReactNode;
  style?: ComponentProps<typeof GlassContainer>["style"];
  spacing?: number;
};

/**
 * Wrapper that renders GlassContainer when available, View with bg-background otherwise
 */
export const GlassContainerWrapper = ({
  children,
  style,
  spacing,
}: GlassContainerWrapperProps) =>
  hasLiquidGlass ? (
    <GlassContainer spacing={spacing} style={style}>
      {children}
    </GlassContainer>
  ) : (
    <View className="bg-background" style={style}>
      {children}
    </View>
  );
