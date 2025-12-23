import type { UIMessage } from "ai";

/**
 * Custom UIMessage type with chat title data part schema and model metadata
 */
export type ChatUIMessage = UIMessage<
  {
    model?: string;
  },
  {
    "chat-title": {
      title: string;
    };
  }
>;
