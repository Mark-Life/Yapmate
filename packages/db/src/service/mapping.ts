/**
 * Mapping functions between AI SDK UIMessage and database schema
 * Pure functions for bidirectional conversion
 */
import type { UIMessage } from "ai";
import type {
  MessageInsert,
  MessageMetadata,
  MessageRole,
  MessageSelect,
} from "../schema/messages";
import type {
  PartInsert,
  PartSelect,
  PartType,
  ToolState,
} from "../schema/parts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of mapping a UIMessage to DB format */
export type MappedMessage = {
  message: MessageInsert;
  parts: PartInsert[];
};

/** DB message with its parts for reconstruction */
export type DbMessageWithParts = MessageSelect & { parts: PartSelect[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extracts tool name from tool part type (e.g., "tool-search" -> "search") */
const extractToolName = (type: string): string | null => {
  if (type.startsWith("tool-")) {
    return type.slice(5);
  }
  return null;
};

/** Maps tool state from AI SDK to DB format */
const mapToolState = (state: string): ToolState => {
  if (state === "output-available") {
    return "result";
  }
  if (state === "approval-requested") {
    return "approval";
  }
  if (state === "input-available") {
    return "call";
  }
  return "partial-call";
};

// ─── UI → DB Mapping ─────────────────────────────────────────────────────────

/** Transient part types that should not be persisted */
const TRANSIENT_PART_TYPES = ["step-start"] as const;

/**
 * Maps a single UI part to a DB part insert
 * Returns null for transient parts that shouldn't be persisted
 * @param part - UI message part from AI SDK
 * @param messageId - ID of the parent message
 * @param order - Position within the message
 * @param fileId - Optional file ID for file parts
 */
export const mapUIPartToDb = (
  part: UIMessage["parts"][number],
  messageId: string,
  order: number,
  fileId?: string
): PartInsert | null => {
  const base = { messageId, order };
  const partType = part.type;

  // Skip transient parts (streaming markers, etc.)
  if (
    TRANSIENT_PART_TYPES.includes(
      partType as (typeof TRANSIENT_PART_TYPES)[number]
    )
  ) {
    return null;
  }

  // Text part
  if (partType === "text") {
    return {
      ...base,
      type: "text" as PartType,
      text_content: part.text,
    };
  }

  // Reasoning part
  if (partType === "reasoning") {
    return {
      ...base,
      type: "reasoning" as PartType,
      reasoning_content: part.text,
    };
  }

  // Source URL part
  if (partType === "source-url") {
    return {
      ...base,
      type: "source" as PartType,
      source_url: part.url,
      source_title: part.title ?? null,
    };
  }

  // Source document part
  if (partType === "source-document") {
    return {
      ...base,
      type: "source" as PartType,
      source_url: part.sourceId,
      source_title: part.title ?? null,
    };
  }

  // File part
  if (partType === "file") {
    if (!fileId) {
      // No fileId means this is a re-save and file part already exists in DB
      // Return null to skip creating a new part (existing will be preserved)
      return null;
    }
    return {
      ...base,
      type: "file" as PartType,
      file_id: fileId,
    };
  }

  // Dynamic tool part
  if (partType === "dynamic-tool") {
    return {
      ...base,
      type: "tool-invocation" as PartType,
      tool_callId: part.toolCallId,
      tool_name: part.toolName,
      tool_state: mapToolState(part.state),
      tool_input: part.input,
      tool_output: "output" in part ? part.output : undefined,
    };
  }

  // Tool part (typed tools have type like "tool-search")
  const toolName = extractToolName(partType);
  if (toolName !== null) {
    const toolPart = part as {
      toolCallId: string;
      state: string;
      input?: unknown;
      output?: unknown;
    };
    return {
      ...base,
      type: "tool-invocation" as PartType,
      tool_callId: toolPart.toolCallId,
      tool_name: toolName,
      tool_state: mapToolState(toolPart.state),
      tool_input: toolPart.input,
      tool_output: toolPart.output,
    };
  }

  // Fallback: store unknown part types as text with serialized content
  return {
    ...base,
    type: "text" as PartType,
    text_content: JSON.stringify(part),
  };
};

/** Options for mapping UIMessage to DB */
type MapUIMessageOptions = {
  model?: string;
  metadata?: MessageMetadata;
  fileIdMap?: Map<number, string>;
  /** User who sent this message (for user messages in multi-user chats) */
  userId?: string;
};

/**
 * Maps a UIMessage to database format (message + parts)
 * @param uiMessage - AI SDK UIMessage
 * @param chatId - ID of the parent chat
 * @param order - Position within the chat
 * @param options - Optional model, metadata, and file ID mapping
 */
export const mapUIMessageToDb = (
  uiMessage: UIMessage,
  chatId: string,
  order: number,
  options?: MapUIMessageOptions
): MappedMessage => {
  const { model, metadata, fileIdMap, userId } = options ?? {};
  const message: MessageInsert = {
    id: uiMessage.id,
    chatId,
    role: uiMessage.role as MessageRole,
    model: model ?? null,
    order,
    metadata: metadata ?? null,
    // Only set userId for user messages (assistant messages don't have a userId)
    userId: uiMessage.role === "user" ? userId : null,
  };

  // Filter out null parts (transient streaming markers)
  const parts: PartInsert[] = uiMessage.parts
    .map((part, idx) => {
      const fileId = fileIdMap?.get(idx);
      return mapUIPartToDb(part, uiMessage.id, idx, fileId);
    })
    .filter((part): part is PartInsert => part !== null);

  return { message, parts };
};

// ─── DB → UI Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a DB part to a UI part
 * @param dbPart - Part from database
 */
export const mapDbPartToUI = (
  dbPart: PartSelect
): UIMessage["parts"][number] => {
  switch (dbPart.type) {
    case "text":
      return {
        type: "text",
        text: dbPart.text_content ?? "",
      };

    case "reasoning":
      return {
        type: "reasoning",
        text: dbPart.reasoning_content ?? "",
      };

    case "source":
      return {
        type: "source-url",
        sourceId: dbPart.id,
        url: dbPart.source_url ?? "",
        title: dbPart.source_title ?? undefined,
      };

    case "tool-invocation": {
      const toolName = dbPart.tool_name ?? "unknown";
      const baseInvocation = {
        toolCallId: dbPart.tool_callId ?? "",
        toolName,
        input: dbPart.tool_input,
      };

      // Return as dynamic-tool for DB-loaded tools
      if (dbPart.tool_state === "result") {
        return {
          type: "dynamic-tool",
          ...baseInvocation,
          state: "output-available" as const,
          output: dbPart.tool_output,
        };
      }

      // "approval" and "call" both map to input-available when loading from DB
      // (approval context is lost on reload - user can re-trigger if needed)
      if (dbPart.tool_state === "approval" || dbPart.tool_state === "call") {
        return {
          type: "dynamic-tool",
          ...baseInvocation,
          state: "input-available" as const,
        };
      }

      return {
        type: "dynamic-tool",
        ...baseInvocation,
        state: "input-streaming" as const,
      };
    }

    case "file":
      // File parts need URL reconstruction from storage
      // This should be handled by the caller with signed URLs
      // The caller should pass file data via context
      return {
        type: "file",
        url: "", // Will be populated by caller with signed URL or dataUrl
        mediaType: "application/octet-stream",
      };

    default:
      return {
        type: "text",
        text: "",
      };
  }
};

/**
 * Maps a DB message with parts to a UIMessage
 * @param dbMessage - Message with parts from database
 */
export const mapDbMessageToUI = (dbMessage: DbMessageWithParts): UIMessage => {
  // Sort parts by order before mapping
  const sortedParts = [...dbMessage.parts].sort((a, b) => a.order - b.order);

  // Filter role to valid UIMessage roles (no "tool" in UIMessage)
  const role = dbMessage.role === "tool" ? "assistant" : dbMessage.role;

  // Build metadata object with model and usage data
  const metadata: Record<string, unknown> = {};
  if (dbMessage.model) {
    metadata.model = dbMessage.model;
  }
  if (dbMessage.metadata) {
    // Preserve all metadata fields (usage, cost, etc.)
    Object.assign(metadata, dbMessage.metadata);
  }
  // Include userId for multi-user chat support (for username prefixing)
  if (dbMessage.userId) {
    metadata.userId = dbMessage.userId;
  }

  return {
    id: dbMessage.id,
    role,
    parts: sortedParts.map(mapDbPartToUI),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
};

/**
 * Maps multiple DB messages with parts to UIMessages
 * @param dbMessages - Array of messages with parts
 */
export const mapDbMessagesToUI = (
  dbMessages: DbMessageWithParts[]
): UIMessage[] => dbMessages.map(mapDbMessageToUI);
