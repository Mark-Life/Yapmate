/**
 * Messages service - CRUD operations for messages and parts
 */
import type { UIMessage } from "ai";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import type { StreamChunk } from "@/server/lib/redis/stream";
import { db } from "../client";
import { type MessageMetadata, messages } from "../schema/messages";
import { parts } from "../schema/parts";
import { getFileAccessUrl, getFilesByIds } from "./files";
import {
  type DbMessageWithParts,
  mapDbMessageToUI,
  mapUIMessageToDb,
} from "./mapping";

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Loads all messages for a chat with their parts, returns as UIMessage[]
 * @param req - Request object for Bun cookie access
 * @param chatId - ID of the chat to load messages for
 */
export const getMessagesByChatId = async (
  req: Request,
  chatId: string
): Promise<UIMessage[]> => {
  // Fetch messages ordered by position
  const dbMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.order);

  if (dbMessages.length === 0) {
    return [];
  }

  // Fetch all parts for these messages
  const messageIds = dbMessages.map((m) => m.id);
  const dbParts = await db
    .select()
    .from(parts)
    .where(inArray(parts.messageId, messageIds))
    .orderBy(parts.messageId, parts.order);

  // Collect file IDs from file parts
  const fileIds = dbParts
    .filter((p) => p.type === "file" && p.file_id)
    .map((p) => p.file_id)
    .filter((id): id is string => Boolean(id));

  // Load all files
  const filesMap = new Map<
    string,
    Awaited<ReturnType<typeof getFilesByIds>>[number]
  >();
  if (fileIds.length > 0) {
    const files = await getFilesByIds(fileIds);
    for (const file of files) {
      filesMap.set(file.id, file);
    }
  }

  // Group parts by messageId for efficient lookup
  const partsByMessageId = new Map<string, typeof dbParts>();
  for (const part of dbParts) {
    const existing = partsByMessageId.get(part.messageId) ?? [];
    existing.push(part);
    partsByMessageId.set(part.messageId, existing);
  }

  // Combine messages with their parts
  const messagesWithParts: DbMessageWithParts[] = dbMessages.map((msg) => ({
    ...msg,
    parts: partsByMessageId.get(msg.id) ?? [],
  }));

  /**
   * Populates file URLs for a single part
   */
  const populateFilePartUrl = async (
    request: Request,
    part: UIMessage["parts"][number],
    dbPart: (typeof dbParts)[number] | undefined,
    fileMap: Map<string, Awaited<ReturnType<typeof getFilesByIds>>[number]>
  ): Promise<UIMessage["parts"][number]> => {
    if (part.type !== "file" || !dbPart?.file_id) {
      return part;
    }

    const file = fileMap.get(dbPart.file_id);
    if (!file) {
      return part;
    }

    try {
      const url = await getFileAccessUrl(request, file);
      return {
        ...part,
        url,
        mediaType: file.mimeType,
        filename: file.filename,
      };
    } catch (e) {
      console.error(`Failed to get file URL for ${dbPart.file_id}:`, e);
      return {
        ...part,
        url: "",
        mediaType: file.mimeType,
        filename: file.filename,
      };
    }
  };

  // Map to UI messages and populate file URLs
  const uiMessages = await Promise.all(
    messagesWithParts.map(async (dbMsg) => {
      const uiMessage = mapDbMessageToUI(dbMsg);

      // Replace file parts with URLs
      const partsWithUrls = await Promise.all(
        uiMessage.parts.map(async (part, idx) => {
          const dbPart = dbMsg.parts[idx];
          return await populateFilePartUrl(req, part, dbPart, filesMap);
        })
      );

      return {
        ...uiMessage,
        parts: partsWithUrls,
      };
    })
  );

  return uiMessages;
};

// ─── Write Operations ────────────────────────────────────────────────────────

/** Options for saving a message */
type SaveMessageOptions = {
  model?: string;
  metadata?: MessageMetadata;
  fileIdMap?: Map<number, string>;
};

/**
 * Syncs messages for a chat - deletes stale messages and saves new/updated ones
 * Used for regeneration scenarios where messages after a certain point need to be removed
 * @param chatId - ID of the chat
 * @param uiMessages - Array of UIMessages to save
 * @param options - Optional metadata per message (keyed by message id)
 */
export const syncMessages = async (
  chatId: string,
  uiMessages: UIMessage[],
  options?: Record<string, SaveMessageOptions>
): Promise<void> => {
  // Delete messages with order >= messages.length (stale messages after regeneration point)
  await deleteMessagesFromOrder(chatId, uiMessages.length);
  // Save the messages (upsert handles new and updated)
  await saveMessages(chatId, uiMessages, options);
};

/**
 * Saves messages for a chat (upsert - handles new and updated messages)
 * @param chatId - ID of the chat
 * @param uiMessages - Array of UIMessages to save
 * @param options - Optional metadata per message (keyed by message id)
 */
export const saveMessages = async (
  chatId: string,
  uiMessages: UIMessage[],
  options?: Record<string, SaveMessageOptions>
): Promise<void> => {
  if (uiMessages.length === 0) {
    return;
  }

  // Map all messages and parts
  const mapped = uiMessages.map((msg, idx) => {
    const opts = options?.[msg.id];
    return mapUIMessageToDb(msg, chatId, idx, {
      model: opts?.model,
      metadata: opts?.metadata,
    });
  });

  const messagesToUpsert = mapped.map((m) => m.message);
  const partsToInsert = mapped.flatMap((m) => m.parts);

  // Use transaction to ensure atomicity
  await db.transaction(async (tx) => {
    // Upsert messages
    for (const msg of messagesToUpsert) {
      await tx
        .insert(messages)
        .values(msg)
        .onConflictDoUpdate({
          target: messages.id,
          set: {
            role: msg.role,
            model: msg.model,
            order: msg.order,
            metadata: msg.metadata,
            updatedAt: new Date(),
          },
        });
    }

    // Delete existing parts for these messages
    const messageIds = messagesToUpsert
      .map((m) => m.id)
      .filter(Boolean) as string[];

    // Check if we have new file parts to insert (initial save vs re-save)
    const hasNewFileParts = partsToInsert.some((p) => p.type === "file");

    if (messageIds.length > 0) {
      if (hasNewFileParts) {
        // Initial save: delete all parts
        await tx.delete(parts).where(inArray(parts.messageId, messageIds));
      } else {
        // Re-save: preserve file parts, delete others
        await tx
          .delete(parts)
          .where(
            and(inArray(parts.messageId, messageIds), ne(parts.type, "file"))
          );
      }
    }

    // Insert new parts (file parts without fileId are skipped in mapping)
    if (partsToInsert.length > 0) {
      await tx.insert(parts).values(partsToInsert);
    }
  });
};

/**
 * Saves a single message with its parts
 * Convenience wrapper around saveMessages for streaming scenarios
 * @param chatId - ID of the chat
 * @param uiMessage - Single UIMessage to save
 * @param order - Position in chat
 * @param options - Optional model and metadata
 */
export const saveMessage = async (
  chatId: string,
  uiMessage: UIMessage,
  order: number,
  options?: SaveMessageOptions
): Promise<void> => {
  const { message, parts: messageParts } = mapUIMessageToDb(
    uiMessage,
    chatId,
    order,
    {
      model: options?.model,
      metadata: options?.metadata,
      fileIdMap: options?.fileIdMap,
    }
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(messages)
      .values(message)
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          role: message.role,
          model: message.model,
          order: message.order,
          metadata: message.metadata,
          updatedAt: new Date(),
        },
      });

    // Check if we have new file parts to insert (initial save vs re-save)
    const hasNewFileParts = messageParts.some((p) => p.type === "file");

    // Delete existing parts for this message
    if (message.id) {
      if (hasNewFileParts) {
        // Initial save: delete all parts
        await tx.delete(parts).where(eq(parts.messageId, message.id));
      } else {
        // Re-save: preserve file parts, delete others
        await tx
          .delete(parts)
          .where(and(eq(parts.messageId, message.id), ne(parts.type, "file")));
      }
    }

    // Insert new parts (file parts without fileId are skipped in mapping)
    if (messageParts.length > 0) {
      await tx.insert(parts).values(messageParts);
    }
  });
};

// ─── Delete Operations ───────────────────────────────────────────────────────

/**
 * Gets a message's order by its ID
 * @param messageId - ID of the message
 * @returns The message's order, or null if not found
 */
export const getMessageOrder = async (
  messageId: string
): Promise<number | null> => {
  const result = await db
    .select({ order: messages.order })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  return result[0]?.order ?? null;
};

/**
 * Deletes messages from a specific order onwards (for regenerate functionality)
 * Parts are automatically deleted via cascade
 * @param chatId - ID of the chat
 * @param fromOrder - Delete messages with order >= this value
 */
export const deleteMessagesFromOrder = async (
  chatId: string,
  fromOrder: number
): Promise<void> => {
  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), gte(messages.order, fromOrder)));
};

/**
 * Deletes a specific message by ID
 * Parts are automatically deleted via cascade
 * @param messageId - ID of the message to delete
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  await db.delete(messages).where(eq(messages.id, messageId));
};

/**
 * Gets the model from the last message in a chat
 * @param chatId - ID of the chat
 * @returns The model string, or null if no messages exist
 */
export const getLastMessageModel = async (
  chatId: string
): Promise<string | null> => {
  const result = await db
    .select({ model: messages.model })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.order))
    .limit(1);

  return result[0]?.model ?? null;
};

/**
 * Extracts content from stream chunks
 * @param chunks - Stream chunks from Redis buffer
 * @returns Object with textContent and reasoningContent
 */
const extractContentFromChunks = (
  chunks: StreamChunk[]
): { textContent: string; reasoningContent: string } => {
  let textContent = "";
  let reasoningContent = "";

  for (const chunk of chunks) {
    const data = chunk.data as Record<string, unknown>;

    if (data.type === "text-delta" && typeof data.delta === "string") {
      textContent += data.delta;
    } else if (
      data.type === "reasoning-delta" &&
      typeof data.delta === "string"
    ) {
      reasoningContent += data.delta;
    } else if (data.type === "reasoning" && typeof data.text === "string") {
      reasoningContent = data.text;
    } else if (data.type === "text" && typeof data.text === "string") {
      textContent = data.text;
    }
  }

  return { textContent, reasoningContent };
};

/**
 * Inserts partial message parts into database
 * @param tx - Database transaction
 * @param messageId - Message ID
 * @param textContent - Text content to insert
 * @param reasoningContent - Reasoning content to insert
 */
const insertPartialMessageParts = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  messageId: string,
  textContent: string,
  reasoningContent: string
): Promise<void> => {
  if (textContent) {
    await tx.insert(parts).values({
      messageId,
      type: "text",
      order: 0,
      text_content: textContent,
    });
  }

  if (reasoningContent) {
    await tx.insert(parts).values({
      messageId,
      type: "reasoning",
      order: textContent ? 1 : 0,
      reasoning_content: reasoningContent,
    });
  }
};

/**
 * Saves a partial assistant message from Redis buffer chunks
 * Called when user aborts or on error
 * @param chatId - ID of the chat
 * @param chunks - Stream chunks from Redis buffer
 */
export const savePartialAssistantMessage = async (
  chatId: string,
  chunks: StreamChunk[]
): Promise<void> => {
  if (chunks.length === 0) {
    return;
  }

  const { textContent, reasoningContent } = extractContentFromChunks(chunks);

  // Skip if no content to save
  if (!(textContent || reasoningContent)) {
    return;
  }

  // Always generate a proper UUID for database storage
  // The AI SDK's generation ID (e.g., "gen-xxx") is not a valid UUID
  const dbMessageId = Bun.randomUUIDv7();

  // Get current message count for order
  const existingMessages = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(eq(messages.chatId, chatId));
  const order = Number(existingMessages[0]?.count ?? 0);

  // Insert partial message
  await db.transaction(async (tx) => {
    await tx.insert(messages).values({
      id: dbMessageId,
      chatId,
      role: "assistant",
      order,
    });

    await insertPartialMessageParts(
      tx,
      dbMessageId,
      textContent,
      reasoningContent
    );
  });
};
