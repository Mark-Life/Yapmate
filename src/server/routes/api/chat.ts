/**
 * Streaming chat API route handler
 * Handles POST for /api/chat
 */
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import type { FileSelect } from "@/db/schema/files";
import { createPendingFile } from "@/db/service/files";
import {
  deleteMessagesFromOrder,
  getMessageOrder,
  saveMessage as saveMessageService,
} from "@/db/service/messages";
import {
  getChat,
  loadChatMessages,
  saveChatMessages,
  updateChatTitle,
} from "@/lib/chat-store";
import { uploadFilesInBackground } from "@/lib/file-upload";
import { openrouter } from "@/lib/openrouter";
import { getCurrentUserId } from "../../lib/supabase";

const TITLE_GENERATION_MODEL = "google/gemma-3n-e4b-it:free";
const MAX_TITLE_LENGTH = 50;

/**
 * Truncates text to max length with ellipsis
 */
const truncateTitle = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
};

/**
 * Generates a chat title from the first user message
 */
const generateChatTitle = async (userMessage: string): Promise<string> => {
  try {
    const result = await streamText({
      model: openrouter.chat(TITLE_GENERATION_MODEL),
      messages: [
        {
          role: "user",
          content: `Generate a short, descriptive title (max 50 chars) for a chat starting with: "${userMessage}"\n\nReturn ONLY the title, no quotes or explanation.\n\nThese are chat titles from user to LLM, so they should be short and descriptive. Use more model perspective titles, not specific to the user's message. So if user says "tell me about SSR", the best Title would be "SSR Explanation" or if user asks whats the capital of France, simply name it "Capital of France"`,
        },
      ],
      maxOutputTokens: 30,
    });

    const title = await result.text;
    const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
    return trimmed || truncateTitle(userMessage);
  } catch {
    return truncateTitle(userMessage);
  }
};

/**
 * Processes file parts from a message and creates file records
 */
const processFileParts = async (
  fileParts: UIMessage["parts"],
  userId: string
): Promise<FileSelect[]> => {
  const fileRecords: FileSelect[] = [];

  for (const filePart of fileParts) {
    if (filePart.type !== "file") {
      continue;
    }

    const fileData = filePart as {
      url?: string;
      mediaType?: string;
      filename?: string;
    };

    if (!fileData.url?.startsWith("data:")) {
      continue;
    }

    const base64Data = fileData.url.split(",")[1];
    const size = base64Data ? Math.ceil((base64Data.length * 3) / 4) : 0;

    const fileRecord = await createPendingFile({
      userId,
      dataUrl: fileData.url,
      filename: fileData.filename || "file",
      mimeType: fileData.mediaType || "application/octet-stream",
      size,
    });

    fileRecords.push(fileRecord);
  }

  return fileRecords;
};

/**
 * Handles regeneration by deleting stale messages after the regeneration point
 */
const handleRegeneration = async (
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
const handleEdit = async (
  chatId: string,
  editMessageId: string,
  editedText: string
): Promise<void> => {
  const allMessages = await loadChatMessages(chatId);
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

/**
 * Processes file parts and maps them to part indices
 */
const processMessageFiles = async (
  message: UIMessage,
  userId: string
): Promise<{
  fileRecords: FileSelect[];
  fileIdByPartIndex: Map<number, string>;
}> => {
  const fileParts = message.parts.filter((p) => p.type === "file");
  let fileRecords: FileSelect[] = [];
  const fileIdByPartIndex = new Map<number, string>();

  if (fileParts.length > 0) {
    fileRecords = await processFileParts(fileParts, userId);

    let fileIndex = 0;
    for (let i = 0; i < message.parts.length; i++) {
      if (message.parts[i].type === "file" && fileIndex < fileRecords.length) {
        fileIdByPartIndex.set(i, fileRecords[fileIndex].id);
        fileIndex += 1;
      }
    }
  }

  return { fileRecords, fileIdByPartIndex };
};

export const chatHandler = {
  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      message,
      model,
      searchEnabled,
      id,
      regenerateMessageId,
      regenerateRole,
      editMessageId,
      editedText,
    }: {
      message: UIMessage;
      model: string;
      searchEnabled?: boolean;
      id: string;
      regenerateMessageId?: string;
      regenerateRole?: "user" | "assistant";
      editMessageId?: string;
      editedText?: string;
    } = await req.json();

    if (!id) {
      return new Response("Chat ID is required", { status: 400 });
    }

    // Verify chat exists and belongs to user
    const chat = await getChat(id);
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }
    if (chat.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    let fileRecords: FileSelect[] = [];
    let isFirstMessage = false;

    // Handle edit: update message text and delete stale messages
    if (editMessageId && editedText) {
      await handleEdit(id, editMessageId, editedText);
    } else {
      // Process file parts and create file records (only if not editing)
      const processedFiles = await processMessageFiles(message, userId);
      fileRecords = processedFiles.fileRecords;
      const fileIdByPartIndex = processedFiles.fileIdByPartIndex;

      // Handle regeneration: delete stale messages after the regeneration point
      if (regenerateMessageId) {
        await handleRegeneration(id, regenerateMessageId, regenerateRole);
      }

      // Save user message before sending to LLM
      const previousMessages = await loadChatMessages(id);
      isFirstMessage = previousMessages.length === 0;
      const messageOrder = previousMessages.length;

      // Save message with file IDs
      await saveMessageService(id, message, messageOrder, {
        fileIdMap: fileIdByPartIndex,
      });

      // Trigger background upload (non-blocking)
      if (fileRecords.length > 0) {
        uploadFilesInBackground(fileRecords, id);
      }
    }

    // Load all messages (includes the newly saved/updated message)
    const allMessages = await loadChatMessages(id);

    const modelWithSearch = searchEnabled ? `${model}:online` : model;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Start title generation in parallel (if first message, skip if editing)
        const titlePromise =
          isFirstMessage && !editMessageId
            ? (async () => {
                const userText =
                  message.parts.find((p) => p.type === "text")?.text ||
                  "New chat";
                try {
                  const title = await generateChatTitle(userText);
                  await updateChatTitle(id, title);
                  writer.write({
                    type: "data-chat-title",
                    data: { title },
                    transient: true,
                  });
                } catch (error) {
                  console.error("Title generation failed:", error);
                }
              })()
            : Promise.resolve();

        const result = streamText({
          model: openrouter.chat(modelWithSearch),
          messages: convertToModelMessages(allMessages),
          system:
            "You are a helpful assistant that can answer questions and help with tasks",
        });

        // Consume the stream to ensure it runs to completion & triggers onFinish
        result.consumeStream();

        // Merge the main response stream
        writer.merge(
          result.toUIMessageStream({
            sendSources: true,
            sendReasoning: true,
          })
        );

        // Wait for title generation - keeps stream open until title is written
        await titlePromise;
      },
      originalMessages: allMessages,
      generateId: () => Bun.randomUUIDv7(),
      onFinish: async ({ messages: finalMessages }) => {
        // Save all messages (upsert handles both new and updated)
        const lastMessageId = finalMessages.at(-1)?.id;
        await saveChatMessages(id, finalMessages, {
          // Add model info to the last assistant message
          ...(lastMessageId ? { [lastMessageId]: { model } } : {}),
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  },
};
