import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getChat, loadChatMessages, saveChatMessages } from "@/lib/chat-store";
import { openrouter } from "@/lib/openrouter";
import { getCurrentUserId } from "@/lib/supabase/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

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

  // Load previous messages from database
  const previousMessages = await loadChatMessages(id);

  // Combine with new message
  const allMessages = [...previousMessages, message];

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
