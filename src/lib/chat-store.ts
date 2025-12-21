/**
 * Chat store - thin wrapper around DB service for app-level operations
 */

import type { UIMessage } from "ai";
import type { MessageMetadata } from "@/db/schema/messages";
import {
  createChat as dbCreateChat,
  deleteChat as dbDeleteChat,
  getChat as dbGetChat,
  getChatsByUser as dbGetChatsByUser,
  getLastAssistantMessageModel as dbGetLastAssistantMessageModel,
  touchChat as dbTouchChat,
  updateChatTitle as dbUpdateChatTitle,
} from "@/db/service/chats";
import {
  getLastMessageModel as dbGetLastMessageModel,
  getMessagesByChatId,
  syncMessages,
} from "@/db/service/messages";

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
 * Gets a chat by ID
 * @param chatId - ID of the chat
 */
export const getChat = dbGetChat;

/**
 * Gets all chats for a user
 * @param userId - ID of the user
 */
export const getUserChats = async (userId: string) => dbGetChatsByUser(userId);

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

/**
 * Gets the model from the last message in a chat
 * @param chatId - ID of the chat
 * @returns The model string, or null if no messages exist
 */
export const getLastMessageModel = dbGetLastMessageModel;

/**
 * Gets the model from the last assistant message in the most recent chat for a user
 * @param userId - ID of the user
 * @returns The model string, or null if no assistant messages exist
 */
export const getLastAssistantMessageModel = dbGetLastAssistantMessageModel;
