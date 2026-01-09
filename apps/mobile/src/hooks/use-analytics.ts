import { useCallback } from "react";
import { posthog } from "@/lib/posthog";

/**
 * Event names for analytics tracking
 * Using [object] [verb] format as recommended by PostHog
 */
export const AnalyticsEvents = {
  // Auth
  USER_SIGNED_OUT: "user signed out",

  // Messaging
  MESSAGE_SENT: "message sent",
  MESSAGE_COPIED: "message copied",
  MESSAGE_REGENERATED: "message regenerated",
  MESSAGE_REGENERATED_WITH_MODEL: "message regenerated with model",
  MESSAGE_EDITED: "message edited",
  MESSAGE_SEND_FAILED: "message send failed",
  STREAM_STOPPED: "stream stopped",

  // Voice
  VOICE_RECORDING_STARTED: "voice recording started",
  VOICE_TRANSCRIPTION_COMPLETED: "voice transcription completed",
  VOICE_TRANSCRIPTION_FAILED: "voice transcription failed",

  // Model
  MODEL_CHANGED: "model changed",

  // Search
  SEARCH_TOGGLED: "search toggled",

  // Chat management
  CHAT_CREATED: "chat created",
  CHAT_OPENED: "chat opened",
  CHAT_RENAMED: "chat renamed",
  CHAT_DELETED: "chat deleted",

  // Settings
  HIDE_EMAIL_TOGGLED: "hide email toggled",
  DELETE_ACCOUNT_INITIATED: "delete account initiated",
  ACCOUNT_DELETED: "account deleted",
  ACCOUNT_DELETE_FAILED: "account delete failed",

  // Attachments
  ATTACHMENT_ADDED: "attachment added",
} as const;

type EventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Event property types for type-safe tracking
 */
type EventProperties = {
  [AnalyticsEvents.USER_SIGNED_OUT]: undefined;

  [AnalyticsEvents.MESSAGE_SENT]: {
    model: string;
    has_attachments: boolean;
    search_enabled: boolean;
  };
  [AnalyticsEvents.MESSAGE_COPIED]: undefined;
  [AnalyticsEvents.MESSAGE_REGENERATED]: { model: string };
  [AnalyticsEvents.MESSAGE_REGENERATED_WITH_MODEL]: {
    model: string;
    previous_model: string;
  };
  [AnalyticsEvents.MESSAGE_EDITED]: undefined;
  [AnalyticsEvents.MESSAGE_SEND_FAILED]: { error?: string };
  [AnalyticsEvents.STREAM_STOPPED]: undefined;

  [AnalyticsEvents.VOICE_RECORDING_STARTED]: undefined;
  [AnalyticsEvents.VOICE_TRANSCRIPTION_COMPLETED]: undefined;
  [AnalyticsEvents.VOICE_TRANSCRIPTION_FAILED]: { error?: string };

  [AnalyticsEvents.MODEL_CHANGED]: { model: string; previous_model?: string };

  [AnalyticsEvents.SEARCH_TOGGLED]: { enabled: boolean };

  [AnalyticsEvents.CHAT_CREATED]: undefined;
  [AnalyticsEvents.CHAT_OPENED]: undefined;
  [AnalyticsEvents.CHAT_RENAMED]: undefined;
  [AnalyticsEvents.CHAT_DELETED]: undefined;

  [AnalyticsEvents.HIDE_EMAIL_TOGGLED]: { enabled: boolean };
  [AnalyticsEvents.DELETE_ACCOUNT_INITIATED]: undefined;
  [AnalyticsEvents.ACCOUNT_DELETED]: undefined;
  [AnalyticsEvents.ACCOUNT_DELETE_FAILED]: { error?: string };

  [AnalyticsEvents.ATTACHMENT_ADDED]: { type: string };
};

/**
 * Custom hook for PostHog analytics tracking
 * Provides typed event tracking functions
 * Note: Uses direct posthog client (no Provider) due to React 19 incompatibility
 */
export const useAnalytics = () => {
  /**
   * Captures a typed event with optional properties
   */
  const capture = useCallback(
    <E extends EventName>(
      eventName: E,
      ...args: EventProperties[E] extends undefined
        ? []
        : [properties: EventProperties[E]]
    ) => {
      const properties = args[0];
      posthog.capture(eventName, properties);
    },
    []
  );

  /**
   * Identifies a user with their ID and optional properties
   */
  const identify = useCallback(
    (
      userId: string,
      properties?: Record<string, string | number | boolean>
    ) => {
      posthog.identify(userId, properties);
    },
    []
  );

  /**
   * Resets user identification (on logout)
   */
  const reset = useCallback(() => {
    posthog.reset();
  }, []);

  return {
    capture,
    identify,
    reset,
    posthog,
  };
};
