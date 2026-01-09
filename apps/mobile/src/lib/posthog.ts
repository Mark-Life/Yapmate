import PostHog from "posthog-react-native";

/**
 * PostHog client instance for analytics tracking
 * Uses Expo environment variables for configuration
 */
export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "", {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  // Disable in development
  disabled: __DEV__,
  // Capture app lifecycle events (install, open, background)
  captureAppLifecycleEvents: true,
  // Enable session replay (beta)
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: true,
  },
});
