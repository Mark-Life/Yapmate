/**
 * Stripe checkout branding colors
 * Hardcoded hex values for light and dark themes
 * These should match the colors defined in globals.css
 *
 * TODO: Consider syncing these with CSS variables in the future
 */

/**
 * Converts hex color to rgba with opacity
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/** Light theme colors */
const lightColors = {
  /** Background color - matches oklch(96.96% 0 0) */
  background: "#f5f5f5",
  /** Primary color - matches oklch(53.11% 0.1062 234.34) */
  primary: "#1375a0",
  /** Border color - primary with 20% opacity, but solid for Stripe */
  border: "#1375a0",
  /** Foreground/text color - matches oklch(16.98% 0 0) */
  foreground: "#2b2b2b",
  /** Muted/secondary text color */
  muted: "#6b7280",
  /** Card background (same as background for now) */
  card: "#f5f5f5",
} as const;

/** Dark theme colors */
const darkColors = {
  /** Background color - matches oklch(14.57% 0 0) */
  background: "#0a0a0a",
  /** Primary color - matches oklch(78.69% 0.1165 192.26) */
  primary: "#47d1cd",
  /** Border color - primary with 20% opacity, but solid for Stripe */
  border: "#47d1cd",
  /** Foreground/text color - matches oklch(92% 0 0) */
  foreground: "#ebebeb",
  /** Muted/secondary text color */
  muted: "#9ca3af",
  /** Card background (same as background for now) */
  card: "#0a0a0a",
} as const;

/**
 * Gets Stripe branding colors for the given theme
 */
export const getStripeBrandingColors = (
  theme: "light" | "dark"
): {
  primary: string;
  background: string;
  border: string;
  foreground: string;
  muted: string;
  card: string;
} => {
  if (theme === "light") {
    return lightColors;
  }
  return darkColors;
};

/**
 * Gets Stripe Elements appearance configuration for the given theme
 * Note: EmbeddedCheckoutProvider has limited appearance support
 * This is prepared for potential future use or if switching to Payment Element
 */
export const getStripeAppearance = (theme: "light" | "dark") => {
  const colors = getStripeBrandingColors(theme);
  const isDark = theme === "dark";

  const themeValue = isDark ? "night" : "stripe";
  const logoColorValue = isDark ? "dark" : "light";

  return {
    theme: themeValue as "night" | "stripe",
    variables: {
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeightNormal: "500",
      borderRadius: "8px",
      colorBackground: colors.background,
      colorPrimary: colors.primary,
      accessibleColorOnColorPrimary: isDark
        ? colors.background
        : colors.foreground,
      colorText: colors.foreground,
      colorTextSecondary: colors.muted,
      colorTextPlaceholder: colors.muted,
      tabIconColor: colors.primary,
      logoColor: logoColorValue as "dark" | "light",
    },
    rules: {
      ".Input": {
        backgroundColor: isDark ? colors.card : "#ffffff",
        border: `1px solid ${hexToRgba(colors.primary, 0.2)}`,
      },
      ".Input:focus": {
        borderColor: colors.primary,
      },
    },
  };
};
