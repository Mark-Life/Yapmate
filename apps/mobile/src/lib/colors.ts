import { isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * Color tokens matching globals.css CSS variables.
 * Use with useColorScheme() from nativewind to get the correct theme.
 */

/** Check liquid glass availability once at module load */
const hasLiquidGlass = isLiquidGlassAvailable();

/** Converts HSL to hex color */
const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/** Theme color token type */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
};

/** Light theme colors matching :root in globals.css */
export const lightColors: ThemeColors = {
  background: hslToHex(100, 0, 96), // hsl(100 0% 96%)
  foreground: hslToHex(0, 0, 6), // hsl(0 0% 6%)
  card: hslToHex(100, 0, 96), // var(--background)
  cardForeground: hslToHex(0, 0, 6), // var(--foreground)
  popover: hslToHex(0, 0, 100), // hsl(0 0% 100%)
  popoverForeground: hslToHex(0, 0, 10), // hsl(0 0% 10%)
  primary: hslToHex(198, 79, 35), // hsl(198 79% 35%)
  primaryForeground: hslToHex(0, 0, 100), // hsl(0 0% 100%)
  secondary: hslToHex(39, 100, 50), // hsl(39 100% 50%)
  secondaryForeground: hslToHex(0, 0, 0), // hsl(0 0% 0%)
  muted: hslToHex(165, 9, 91), // hsl(165 9% 91%)
  mutedForeground: hslToHex(0, 0, 32), // hsl(0 0% 32%)
  accent: hslToHex(176, 25, 89), // hsl(176 25% 89%)
  accentForeground: hslToHex(0, 0, 9), // hsl(0 0% 9%)
  destructive: hslToHex(1, 65, 47), // hsl(1 65% 47%)
  border: "rgba(14, 116, 144, 0.2)", // hsl(198 79% 35% / 0.2)
  input: "rgba(14, 116, 144, 0.2)", // hsl(198 79% 35% / 0.2)
  ring: "rgba(14, 116, 144, 0.2)", // hsl(198 79% 35% / 0.2)
  chart1: hslToHex(12, 76, 61),
  chart2: hslToHex(173, 58, 39),
  chart3: hslToHex(197, 37, 24),
  chart4: hslToHex(43, 74, 66),
  chart5: hslToHex(27, 87, 67),
};

/** Dark theme colors matching .dark in globals.css */
export const darkColors: ThemeColors = {
  background: hslToHex(0, 0, 4), // hsl(0 0% 4%)
  foreground: hslToHex(0, 0, 96), // hsl(0 0% 96%)
  card: hslToHex(0, 0, 4), // var(--background)
  cardForeground: hslToHex(0, 0, 96), // var(--foreground)
  popover: hslToHex(0, 0, 0), // hsl(0 0% 0%)
  popoverForeground: hslToHex(33, 27, 92), // hsl(33 27% 92%)
  primary: hslToHex(178, 60, 55), // hsl(178 60% 55%)
  primaryForeground: hslToHex(0, 0, 9), // hsl(0 0% 9%)
  secondary: hslToHex(39, 100, 50), // hsl(39 100% 50%)
  secondaryForeground: hslToHex(0, 0, 0), // hsl(0 0% 0%)
  muted: hslToHex(0, 0, 14.9), // hsl(0 0% 14.9%)
  mutedForeground: hslToHex(0, 0, 63.9), // hsl(0 0% 63.9%)
  accent: "rgba(71, 209, 204, 0.125)", // rgba(71, 209, 204, 0.125)
  accentForeground: hslToHex(0, 0, 98), // hsl(0 0% 98%)
  destructive: hslToHex(0, 84.24, 60.2), // hsl(0, 84.24%, 60.2%)
  border: "rgba(71, 209, 204, 0.2)", // hsl(178 60% 55% / 0.2)
  input: "rgba(71, 209, 204, 0.2)", // hsl(178 60% 55% / 0.2)
  ring: "rgba(71, 209, 204, 0.2)", // hsl(178 60% 55% / 0.2)
  chart1: hslToHex(220, 70, 50),
  chart2: hslToHex(160, 60, 45),
  chart3: hslToHex(30, 80, 55),
  chart4: hslToHex(280, 65, 60),
  chart5: hslToHex(340, 75, 55),
};

/**
 * Returns the appropriate color theme based on color scheme.
 * @param colorScheme - "light" | "dark" from useColorScheme()
 */
export const getThemeColors = (
  colorScheme: "light" | "dark" | undefined
): ThemeColors => (colorScheme === "dark" ? darkColors : lightColors);

/**
 * Border radius tokens matching Tailwind classes.
 * Base radius from globals.css: --radius: 0.875rem (14px)
 */
const BASE_RADIUS = 14; // 0.875rem = 14px

export const radius = {
  none: 0,
  sm: BASE_RADIUS - 4, // 10px - rounded-sm
  DEFAULT: BASE_RADIUS - 2, // 12px - rounded
  md: BASE_RADIUS, // 14px - rounded-md
  lg: BASE_RADIUS + 2, // 16px - rounded-lg
  xl: BASE_RADIUS + 6, // 20px - rounded-xl
  "2xl": BASE_RADIUS + 10, // 24px - rounded-2xl
  "3xl": BASE_RADIUS + 14, // 28px - rounded-3xl
  full: 9999, // rounded-full
} as const;

export type RadiusKey = keyof typeof radius;

/**
 * Returns modal background color - transparent for liquid glass, themed color otherwise
 */
export const getModalBackground = (
  colorScheme: "light" | "dark" | undefined
): string =>
  hasLiquidGlass ? "transparent" : getThemeColors(colorScheme).background;
