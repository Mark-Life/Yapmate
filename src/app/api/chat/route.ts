import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { FileSelect } from "@/db/schema/files";
import { createPendingFile } from "@/db/service/files";
import { saveMessage as saveMessageService } from "@/db/service/messages";
import { getChat, loadChatMessages, saveChatMessages } from "@/lib/chat-store";
import { uploadFilesInBackground } from "@/lib/file-upload";
import { openrouter } from "@/lib/openrouter";
import { getCurrentUserId } from "@/lib/supabase/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 120;

/**
 * Processes file parts from a message and creates file records
 * @param fileParts - File parts from the message
 * @param userId - ID of the user
 * @returns Array of created file records
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
      continue; // Skip if no URL or not a data URL
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

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    message,
    model,
    searchEnabled,
    id,
  }: {
    message: UIMessage;
    model: string;
    searchEnabled?: boolean;
    id: string;
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

  // Process file parts and create file records
  const fileParts = message.parts.filter((p) => p.type === "file");
  let fileRecords: FileSelect[] = [];
  const fileIdByPartIndex = new Map<number, string>();

  if (fileParts.length > 0) {
    fileRecords = await processFileParts(fileParts, userId);

    // Map file records to part indices
    let fileIndex = 0;
    for (let i = 0; i < message.parts.length; i++) {
      if (message.parts[i].type === "file" && fileIndex < fileRecords.length) {
        fileIdByPartIndex.set(i, fileRecords[fileIndex].id);
        fileIndex += 1;
      }
    }
  }

  // Save user message before sending to LLM
  const previousMessages = await loadChatMessages(id);
  const messageOrder = previousMessages.length;

  // Save message with file IDs
  await saveMessageService(id, message, messageOrder, {
    fileIdMap: fileIdByPartIndex,
  });

  // Load all messages (includes the newly saved message)
  const allMessages = await loadChatMessages(id);

  // Trigger background upload (non-blocking)
  if (fileRecords.length > 0) {
    uploadFilesInBackground(fileRecords, id);
  }

  const modelWithSearch = searchEnabled ? `${model}:online` : model;
  const result = streamText({
    model: openrouter.chat(modelWithSearch),
    messages: convertToModelMessages(allMessages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
  });

  // Consume the stream to ensure it runs to completion & triggers onFinish
  // even when the client response is aborted
  result.consumeStream();

  // Send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    originalMessages: allMessages,
    generateMessageId: () => Bun.randomUUIDv7(),
    sendSources: true,
    sendReasoning: true,
    onFinish: async ({ messages: finalMessages }) => {
      // Save all messages (upsert handles both new and updated)
      const lastMessageId = finalMessages.at(-1)?.id;
      await saveChatMessages(id, finalMessages, {
        // Add model info to the last assistant message
        ...(lastMessageId ? { [lastMessageId]: { model } } : {}),
      });
    },
  });
}
