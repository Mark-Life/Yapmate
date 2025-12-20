import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openrouter } from "@/lib/openrouter";
import { loadChatMessages, saveChatMessages } from "@/lib/chat-store";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
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
      await saveChatMessages(id, finalMessages, {
        // Add model info to the last assistant message
        [finalMessages[finalMessages.length - 1]?.id]: { model },
      });
    },
  });
}
