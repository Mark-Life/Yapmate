/**
 * Message handling utilities (regeneration, editing)
 */

import {
  deleteMessagesFromOrder,
  getMessageOrder,
  saveMessage as saveMessageService,
} from "@yapmate/db/service";
import type { UIMessage } from "ai";
import { loadChatMessages } from "./store";

/**
 * Handles regeneration by deleting stale messages after the regeneration point
 */
export const handleRegeneration = async (
  chatId: string,
  regenerateMessageId: string,
  regenerateRole?: "user" | "assistant"
): Promise<void> => {
  const regenerateOrder = await getMessageOrder(regenerateMessageId);
  if (regenerateOrder !== null) {
    const fromOrder =
      regenerateRole === "assistant" ? regenerateOrder : regenerateOrder + 1;
    await deleteMessagesFromOrder(chatId, fromOrder);
  }
};

/**
 * Handles editing a user message by updating its text and deleting stale messages
 */
export const handleEdit = async (
  req: Request,
  chatId: string,
  editMessageId: string,
  editedText: string
): Promise<void> => {
  const allMessages = await loadChatMessages(req, chatId);
  const messageToEdit = allMessages.find((msg) => msg.id === editMessageId);

  if (messageToEdit && messageToEdit.role === "user") {
    const updatedParts = messageToEdit.parts.map((part) =>
      part.type === "text" ? { type: "text" as const, text: editedText } : part
    );

    const updatedMessage: UIMessage = {
      ...messageToEdit,
      parts: updatedParts,
    };

    const editOrder = await getMessageOrder(editMessageId);
    if (editOrder !== null) {
      await deleteMessagesFromOrder(chatId, editOrder + 1);
      await saveMessageService(chatId, updatedMessage, editOrder, {});
    }
  }
};
