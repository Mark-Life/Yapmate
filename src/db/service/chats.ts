/**
 * Chats service - CRUD operations for chat sessions
 */
import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { chats, type ChatInsert, type ChatSelect } from "../schema/chats";
import { messages } from "../schema/messages";
import { parts } from "../schema/parts";

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Gets a single chat by ID
 * @param chatId - ID of the chat to retrieve
 */
export const getChat = async (chatId: string): Promise<ChatSelect | null> => {
  const result = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);
  return result[0] ?? null;
};

/**
 * Gets all chats for a user, ordered by most recently updated
 * @param userId - ID of the user
 */
export const getChatsByUser = async (userId: string): Promise<ChatSelect[]> =>
  db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));

// ─── Write Operations ────────────────────────────────────────────────────────

/**
 * Creates a new chat session
 * @param userId - ID of the user creating the chat
 * @param title - Optional title for the chat
 * @param id - Optional pre-generated ID (for client-side ID generation)
 */
export const createChat = async (
  userId: string,
  title?: string,
  id?: string
): Promise<string> => {
  const values: ChatInsert = {
    userId,
    title: title ?? null,
    ...(id && { id }),
  };

  const result = await db
    .insert(chats)
    .values(values)
    .returning({ id: chats.id });
  return result[0].id;
};

/**
 * Updates the title of a chat
 * @param chatId - ID of the chat to update
 * @param title - New title
 */
export const updateChatTitle = async (
  chatId: string,
  title: string
): Promise<void> => {
  await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(eq(chats.id, chatId));
};

/**
 * Updates the active stream ID for a chat (for resumable streams)
 * @param chatId - ID of the chat
 * @param streamId - Active stream ID, or null to clear
 */
export const updateActiveStreamId = async (
  chatId: string,
  streamId: string | null
): Promise<void> => {
  await db
    .update(chats)
    .set({ activeStreamId: streamId, updatedAt: new Date() })
    .where(eq(chats.id, chatId));
};

/**
 * Touches a chat (updates updatedAt timestamp)
 * Useful when adding messages to keep sort order correct
 * @param chatId - ID of the chat
 */
export const touchChat = async (chatId: string): Promise<void> => {
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
};

// ─── Delete Operations ───────────────────────────────────────────────────────

/**
 * Deletes a chat and all its messages/parts (via cascade)
 * @param chatId - ID of the chat to delete
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  await db.delete(chats).where(eq(chats.id, chatId));
};

// ─── Branching ───────────────────────────────────────────────────────────────

/**
 * Creates a branch from an existing chat at a specific message
 * Copies all messages up to and including the branch point
 * @param originalChatId - ID of the chat to branch from
 * @param fromMessageOrder - Order of the last message to include in branch
 * @param userId - ID of the user (for ownership of new chat)
 */
export const branchChat = async (
  originalChatId: string,
  fromMessageOrder: number,
  userId: string
): Promise<string> => {
  // Get original chat for title
  const originalChat = await getChat(originalChatId);
  if (!originalChat) {
    throw new Error(`Chat ${originalChatId} not found`);
  }

  return db.transaction(async (tx) => {
    // Create new branched chat
    const branchTitle = originalChat.title
      ? `${originalChat.title} (branch)`
      : "Branched chat";

    const [newChat] = await tx
      .insert(chats)
      .values({
        userId,
        title: branchTitle,
        parentChatId: originalChatId,
      })
      .returning({ id: chats.id });

    // Get messages to copy (up to and including branch point)
    const messagesToCopy = await tx
      .select()
      .from(messages)
      .where(eq(messages.chatId, originalChatId))
      .orderBy(messages.order);

    const filteredMessages = messagesToCopy.filter(
      (m) => m.order <= fromMessageOrder
    );

    if (filteredMessages.length === 0) {
      return newChat.id;
    }

    // Get parts for these messages
    const messageIds = filteredMessages.map((m) => m.id);
    const partsToCopy = await tx
      .select()
      .from(parts)
      .where(
        messageIds.length === 1
          ? eq(parts.messageId, messageIds[0])
          : eq(parts.messageId, messageIds[0]) // Will handle multiple in loop
      );

    // For multiple messages, we need to fetch parts properly
    const allParts =
      messageIds.length > 1
        ? await Promise.all(
            messageIds.map((id) =>
              tx.select().from(parts).where(eq(parts.messageId, id))
            )
          ).then((results) => results.flat())
        : partsToCopy;

    // Create new message IDs mapping (old -> new)
    const messageIdMap = new Map<string, string>();

    // Insert copied messages with new IDs
    for (const msg of filteredMessages) {
      const [newMsg] = await tx
        .insert(messages)
        .values({
          chatId: newChat.id,
          role: msg.role,
          model: msg.model,
          order: msg.order,
          metadata: msg.metadata,
        })
        .returning({ id: messages.id });

      messageIdMap.set(msg.id, newMsg.id);
    }

    // Update branchPointMessageId to the last copied message's new ID
    const lastOriginalMessageId =
      filteredMessages[filteredMessages.length - 1].id;
    const branchPointNewId = messageIdMap.get(lastOriginalMessageId);

    await tx
      .update(chats)
      .set({ branchPointMessageId: branchPointNewId })
      .where(eq(chats.id, newChat.id));

    // Insert copied parts with new message IDs
    for (const part of allParts) {
      const newMessageId = messageIdMap.get(part.messageId);
      if (newMessageId) {
        await tx.insert(parts).values({
          messageId: newMessageId,
          type: part.type,
          order: part.order,
          text_content: part.text_content,
          reasoning_content: part.reasoning_content,
          source_url: part.source_url,
          source_title: part.source_title,
          tool_callId: part.tool_callId,
          tool_name: part.tool_name,
          tool_state: part.tool_state,
          tool_input: part.tool_input,
          tool_output: part.tool_output,
          tool_error: part.tool_error,
          file_id: part.file_id,
        });
      }
    }

    return newChat.id;
  });
};
