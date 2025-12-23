import type { MessageMetadata } from "@yapmate/db/schema";
import type { UIMessage } from "ai";

/**
 * Custom UIMessage type with chat title data part schema and model/usage metadata
 */
export type ChatUIMessage = UIMessage<
  {
    model?: string;
  } & MessageMetadata,
  {
    "chat-title": {
      title: string;
    };
  }
>;
