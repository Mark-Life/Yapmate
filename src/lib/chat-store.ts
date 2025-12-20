/**
 * Chat store - thin wrapper around DB service for app-level operations
 */
import {
  createChat as dbCreateChat,
  getChat as dbGetChat,
  getChatsByUser as dbGetChatsByUser,
  deleteChat as dbDeleteChat,
  updateChatTitle as dbUpdateChatTitle,
  touchChat as dbTouchChat,
} from "@/db/service/chats";
import { getMessagesByChatId, saveMessages } from "@/db/service/messages";
import type { UIMessage } from "ai";
import type { MessageMetadata } from "@/db/schema/messages";

// TODO: Replace with actual auth when implemented
const TEMP_USER_ID = "9e67edd6-7142-4f10-9dc5-3899bbcf54a6";

/**
 * Creates a new chat and returns its ID
 * @param title - Optional chat title
 * @param id - Optional pre-generated ID (for client-side ID generation)
 */
export const createChat = async (
  title?: string,
  id?: string
): Promise<string> => dbCreateChat(TEMP_USER_ID, title, id);

/**
 * Gets a chat by ID
 * @param chatId - ID of the chat
 */
export const getChat = dbGetChat;

/**
 * Gets all chats for the current user
 */
export const getUserChats = async () => dbGetChatsByUser(TEMP_USER_ID);

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
 * @param chatId - ID of the chat
 * @param messages - UIMessages to save
 * @param options - Optional metadata per message (keyed by message id)
 */
export const saveChatMessages = async (
  chatId: string,
  messages: UIMessage[],
  options?: Record<string, SaveChatOptions>
): Promise<void> => {
  await saveMessages(chatId, messages, options);
  await dbTouchChat(chatId);
};
