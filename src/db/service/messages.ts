/**
 * Messages service - CRUD operations for messages and parts
 */
import type { UIMessage } from "ai";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../client";
import { messages, type MessageMetadata } from "../schema/messages";
import { parts } from "../schema/parts";
import {
  mapUIMessageToDb,
  mapDbMessageToUI,
  type DbMessageWithParts,
} from "./mapping";

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Loads all messages for a chat with their parts, returns as UIMessage[]
 * @param chatId - ID of the chat to load messages for
 */
export const getMessagesByChatId = async (
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

  return messagesWithParts.map(mapDbMessageToUI);
};

// ─── Write Operations ────────────────────────────────────────────────────────

/** Options for saving a message */
type SaveMessageOptions = {
  model?: string;
  metadata?: MessageMetadata;
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
  if (uiMessages.length === 0) return;

  // Map all messages and parts
  const mapped = uiMessages.map((msg, idx) => {
    const opts = options?.[msg.id];
    return mapUIMessageToDb(msg, chatId, idx, opts?.model, opts?.metadata);
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

    // Delete existing parts for these messages (will be replaced)
    const messageIds = messagesToUpsert
      .map((m) => m.id)
      .filter(Boolean) as string[];
    if (messageIds.length > 0) {
      await tx.delete(parts).where(inArray(parts.messageId, messageIds));
    }

    // Insert new parts
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
    options?.model,
    options?.metadata
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

    // Delete existing parts for this message
    if (message.id) {
      await tx.delete(parts).where(eq(parts.messageId, message.id));
    }

    // Insert new parts
    if (messageParts.length > 0) {
      await tx.insert(parts).values(messageParts);
    }
  });
};

// ─── Delete Operations ───────────────────────────────────────────────────────

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
