import type { CustomDataParts } from "@yapmate/core/types";
import type { MessageMetadata } from "@yapmate/db/schema";
import type { UIMessage } from "ai";

/**
 * Custom UIMessage type with chat title data part schema and model/usage metadata
 */
export type ChatUIMessage = UIMessage<
  {
    model?: string;
  } & MessageMetadata,
  CustomDataParts
>;

/**
 * Extended UI message part type including custom parts
 */
export type ChatUIMessagePart = ChatUIMessage["parts"][number];
