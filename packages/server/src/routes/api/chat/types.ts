import type {
  MessageError,
  MessageMetadata,
  MessageStatus,
} from "@yapmate/db/schema";
import type { UIMessage } from "ai";

/**
 * Custom UIMessage type with chat title data part schema and model/usage metadata
 */
export type ChatUIMessage = UIMessage<
  {
    model?: string;
    status?: MessageStatus;
    error?: Omit<MessageError, "raw">;
  } & MessageMetadata,
  {
    "chat-title": {
      title: string;
    };
  }
>;
