/**
 * Chat store - thin wrapper around DB service for app-level operations
 */

import type { MessageMetadata } from "@yapmate/db/schema";
import {
  clearActiveStreamId,
  createChat as dbCreateChat,
  deleteChat as dbDeleteChat,
  getChat as dbGetChat,
  getChatsByUser as dbGetChatsByUser,
  getChatsByUserWithLastModel as dbGetChatsByUserWithLastModel,
  touchChat as dbTouchChat,
  updateChatTitle as dbUpdateChatTitle,
  getMessagesByChatId,
  syncMessages,
} from "@yapmate/db/service";
import { getStreamStatus } from "@yapmate/server/lib/redis/stream";
import type { UIMessage } from "ai";

/**
 * Creates a new chat and returns its ID
 * @param userId - ID of the user creating the chat
 * @param title - Optional chat title
 * @param id - Optional pre-generated ID (for client-side ID generation)
 */
export const createChat = async (
  userId: string,
  title?: string,
  id?: string
): Promise<string> => dbCreateChat(userId, title, id);

/**
 * Gets a chat by ID, cleaning up stale activeStreamId if stream is no longer active
 * @param chatId - ID of the chat
 */
export const getChat = async (chatId: string) => {
  const chat = await dbGetChat(chatId);
  if (chat?.activeStreamId) {
    const status = await getStreamStatus(chat.activeStreamId);
    if (status === null || status === "complete" || status === "error") {
      await clearActiveStreamId(chatId, chat.activeStreamId);
      return { ...chat, activeStreamId: null };
    }
  }
  return chat;
};

/**
 * Gets all chats for a user
 * @param userId - ID of the user
 */
export const getUserChats = async (userId: string) => dbGetChatsByUser(userId);

/**
 * Gets all chats for a user with last used model
 * @param userId - ID of the user
 */
export const getUserChatsWithLastModel = async (userId: string) =>
  dbGetChatsByUserWithLastModel(userId);

/**
 * Deletes a chat
 * @param chatId - ID of the chat to delete
 */
export const deleteChat = dbDeleteChat;

/**
 * Updates chat title
 * @param chatId - ID of the chat
 * @param title - New title
 */
export const updateChatTitle = dbUpdateChatTitle;

/**
 * Loads messages for a chat as UIMessage[]
 * @param req - Request object for Bun cookie access
 * @param chatId - ID of the chat
 */
export const loadChatMessages = getMessagesByChatId;

/** Options for saving chat messages */
type SaveChatOptions = {
  model?: string;
  metadata?: MessageMetadata;
};

/**
 * Saves messages for a chat
 * Also touches the chat to update its timestamp
 * Uses sync to handle regeneration scenarios (deletes stale messages)
 * @param chatId - ID of the chat
 * @param messages - UIMessages to save
 * @param options - Optional metadata per message (keyed by message id)
 */
export const saveChatMessages = async (
  chatId: string,
  messages: UIMessage[],
  options?: Record<string, SaveChatOptions>
): Promise<void> => {
  await syncMessages(chatId, messages, options);
  await dbTouchChat(chatId);
};
