import { usePostHog as usePostHogHook } from "posthog-js/react";
import { useCallback } from "react";

/**
 * Custom hook for PostHog analytics tracking
 * Provides typed event tracking functions for common actions
 */
export const usePostHog = () => {
  const posthog = usePostHogHook();

  /**
   * Captures a custom event with optional properties
   */
  const capture = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      if (!posthog) {
        return;
      }
      posthog.capture(eventName, properties);
    },
    [posthog]
  );

  /**
   * Identifies a user with their ID and optional properties
   */
  const identify = useCallback(
    (userId: string, properties?: Record<string, unknown>) => {
      if (!posthog) {
        return;
      }
      posthog.identify(userId, properties);
    },
    [posthog]
  );

  /**
   * Sets user properties (person properties)
   */
  const setUserProperties = useCallback(
    (properties: Record<string, unknown>) => {
      if (!posthog) {
        return;
      }
      posthog.setPersonProperties(properties);
    },
    [posthog]
  );

  /**
   * Resets user identification (on logout)
   */
  const reset = useCallback(() => {
    if (!posthog) {
      return;
    }
    posthog.reset();
  }, [posthog]);

  return {
    capture,
    identify,
    setUserProperties,
    reset,
    posthog, // Expose raw PostHog instance for advanced usage
  };
};
