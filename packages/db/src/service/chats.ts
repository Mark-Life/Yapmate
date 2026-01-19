/**
 * Chats service - CRUD operations for chat sessions
 */
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../client";
import { chatMembers } from "../schema/chat-members";
import { type ChatInsert, type ChatSelect, chats } from "../schema/chats";
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
 * Gets all chats for a user (owned or member), ordered by most recently updated
 * @param userId - ID of the user
 */
export const getChatsByUser = async (userId: string): Promise<ChatSelect[]> => {
  // Get chat IDs where user is a member
  const memberChatIds = await db
    .selectDistinct({ chatId: chatMembers.chatId })
    .from(chatMembers)
    .where(eq(chatMembers.userId, userId));

  const memberIds = memberChatIds.map((m) => m.chatId);

  // Get chats where user is owner OR member
  if (memberIds.length === 0) {
    // No member chats, just get owned chats
    return db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
  }

  return db
    .select()
    .from(chats)
    .where(or(eq(chats.userId, userId), inArray(chats.id, memberIds)))
    .orderBy(desc(chats.updatedAt));
};

/** Chat with last used model from most recent assistant message */
export type ChatWithLastModel = ChatSelect & { lastUsedModel: string | null };

/**
 * Gets all chats for a user with last used model, ordered by most recently updated
 * The lastUsedModel is the model from the most recent assistant message in each chat
 * @param userId - ID of the user
 */
export const getChatsByUserWithLastModel = async (
  userId: string
): Promise<ChatWithLastModel[]> => {
  // Get all user chats
  const userChats = await getChatsByUser(userId);
  if (userChats.length === 0) {
    return [];
  }

  // Get last assistant model for each chat using a single query with lateral join simulation
  const chatIds = userChats.map((c) => c.id);

  // Get latest assistant message model per chat using window function approach
  const lastModels = await db
    .selectDistinctOn([messages.chatId], {
      chatId: messages.chatId,
      model: messages.model,
    })
    .from(messages)
    .where(
      and(
        eq(messages.role, "assistant"),
        chatIds.length === 1 ? eq(messages.chatId, chatIds[0]) : undefined // Use filter instead for multiple
      )
    )
    .orderBy(messages.chatId, desc(messages.order));

  // Filter to only include chats in our list when multiple
  const filteredModels =
    chatIds.length === 1
      ? lastModels
      : lastModels.filter((m) => chatIds.includes(m.chatId));

  // Create lookup map
  const modelMap = new Map(filteredModels.map((m) => [m.chatId, m.model]));

  // Merge with chats
  return userChats.map((chat) => ({
    ...chat,
    lastUsedModel: modelMap.get(chat.id) ?? null,
  }));
};

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
 * Updates the active stream ID within a transaction
 * Used for atomic operations that need to update stream ID along with other data
 * @param tx - Database transaction
 * @param chatId - ID of the chat
 * @param streamId - Active stream ID, or null to clear
 */
export const updateActiveStreamIdTx = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  chatId: string,
  streamId: string | null
): Promise<void> => {
  await tx
    .update(chats)
    .set({ activeStreamId: streamId, updatedAt: new Date() })
    .where(eq(chats.id, chatId));
};

/**
 * Clears activeStreamId only if it matches the given streamId (prevents race conditions)
 * @param chatId - ID of the chat
 * @param streamId - Stream ID to match before clearing
 */
export const clearActiveStreamId = async (
  chatId: string,
  streamId: string
): Promise<void> => {
  await db
    .update(chats)
    .set({ activeStreamId: null, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.activeStreamId, streamId)));
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

/**
 * Gets the model from the last assistant message in the most recent chat for a user
 * @param userId - ID of the user
 * @returns The model string, or null if no assistant messages exist
 */
export const getLastAssistantMessageModel = async (
  userId: string
): Promise<string | null> => {
  // Get the most recent chat for the user
  const mostRecentChat = await db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(1);

  if (mostRecentChat.length === 0) {
    return null;
  }

  const chatId = mostRecentChat[0].id;

  // Get the last assistant message from that chat
  const result = await db
    .select({ model: messages.model })
    .from(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.role, "assistant")))
    .orderBy(desc(messages.order))
    .limit(1);

  return result[0]?.model ?? null;
};

// ─── Branching ───────────────────────────────────────────────────────────────

/**
 * Creates a new branched chat in the transaction
 */
const createBranchedChat = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  originalTitle: string | null,
  userId: string,
  originalChatId: string
) => {
  const branchTitle = originalTitle
    ? `${originalTitle} (branch)`
    : "Branched chat";
  const [newChat] = await tx
    .insert(chats)
    .values({
      userId,
      title: branchTitle,
      parentChatId: originalChatId,
    })
    .returning({ id: chats.id });
  return newChat.id;
};

/**
 * Gets messages to copy up to and including the branch point
 */
const getMessagesToCopy = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  originalChatId: string,
  fromMessageOrder: number
) => {
  const messagesToCopy = await tx
    .select()
    .from(messages)
    .where(eq(messages.chatId, originalChatId))
    .orderBy(messages.order);
  return messagesToCopy.filter((m) => m.order <= fromMessageOrder);
};

/**
 * Gets all parts for the given message IDs
 */
const getPartsForMessages = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  messageIds: string[]
) => {
  if (messageIds.length === 0) {
    return [];
  }
  if (messageIds.length === 1) {
    return tx.select().from(parts).where(eq(parts.messageId, messageIds[0]));
  }
  const results = await Promise.all(
    messageIds.map((id) =>
      tx.select().from(parts).where(eq(parts.messageId, id))
    )
  );
  return results.flat();
};

/**
 * Copies messages and returns a map of old message ID to new message ID
 */
const copyMessages = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  messagesToCopy: Awaited<ReturnType<typeof getMessagesToCopy>>,
  newChatId: string
) => {
  const messageIdMap = new Map<string, string>();
  for (const msg of messagesToCopy) {
    const [newMsg] = await tx
      .insert(messages)
      .values({
        chatId: newChatId,
        role: msg.role,
        model: msg.model,
        order: msg.order,
        metadata: msg.metadata,
      })
      .returning({ id: messages.id });
    messageIdMap.set(msg.id, newMsg.id);
  }
  return messageIdMap;
};

/**
 * Copies parts with updated message IDs
 */
const copyParts = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  partsToCopy: Awaited<ReturnType<typeof getPartsForMessages>>,
  messageIdMap: Map<string, string>
) => {
  for (const part of partsToCopy) {
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
};

/**
 * Updates the branch point message ID for the new chat
 */
const updateBranchPoint = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  newChatId: string,
  filteredMessages: Awaited<ReturnType<typeof getMessagesToCopy>>,
  messageIdMap: Map<string, string>
) => {
  const lastOriginalMessageId = filteredMessages.at(-1)?.id;
  if (!lastOriginalMessageId) {
    return;
  }
  const branchPointNewId = messageIdMap.get(lastOriginalMessageId);
  if (branchPointNewId) {
    await tx
      .update(chats)
      .set({ branchPointMessageId: branchPointNewId })
      .where(eq(chats.id, newChatId));
  }
};

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
  const originalChat = await getChat(originalChatId);
  if (!originalChat) {
    throw new Error(`Chat ${originalChatId} not found`);
  }

  return db.transaction(async (tx) => {
    const newChatId = await createBranchedChat(
      tx,
      originalChat.title,
      userId,
      originalChatId
    );

    const filteredMessages = await getMessagesToCopy(
      tx,
      originalChatId,
      fromMessageOrder
    );

    if (filteredMessages.length === 0) {
      return newChatId;
    }

    const messageIds = filteredMessages.map((m) => m.id);
    const allParts = await getPartsForMessages(tx, messageIds);
    const messageIdMap = await copyMessages(tx, filteredMessages, newChatId);
    await updateBranchPoint(tx, newChatId, filteredMessages, messageIdMap);
    await copyParts(tx, allParts, messageIdMap);

    return newChatId;
  });
};
