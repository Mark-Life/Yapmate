import type { UIMessage } from "ai";

/**
 * Custom UIMessage type with chat title data part schema
 */
export type ChatUIMessage = UIMessage<
  never,
  {
    "chat-title": {
      title: string;
    };
  }
>;
