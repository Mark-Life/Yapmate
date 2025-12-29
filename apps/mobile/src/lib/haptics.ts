import * as Haptics from "expo-haptics";

/**
 * Light tap haptic feedback for button presses
 */
export const lightTap = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/**
 * Medium impact haptic feedback for drawer snap
 */
export const mediumImpact = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
