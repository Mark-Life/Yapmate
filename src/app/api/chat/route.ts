import {
  convertToModelMessages,
  streamText,
  type UIMessage,
  createIdGenerator,
} from "ai";
import { openrouter } from "@/lib/openrouter";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    searchEnabled,
    id,
  }: {
    messages: UIMessage[];
    model: string;
    searchEnabled?: boolean;
    id: string;
  } = await req.json();

  if (!id) {
    return new Response("Chat ID is required", { status: 400 });
  }

  // TODO: When implementing persistence, load previous messages from database here
  // const previousMessages = await loadChat(id);
  // const messages = [...previousMessages, message];

  const modelWithSearch = searchEnabled ? `${model}:online` : model;
  const result = streamText({
    model: openrouter.chat(modelWithSearch),
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
  });

  // Consume the stream to ensure it runs to completion & triggers onFinish
  // even when the client response is aborted
  result.consumeStream();

  // Send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    sendSources: true,
    sendReasoning: true,
    // TODO: When implementing persistence, save messages to database here
    // onFinish: ({ messages: finalMessages }) => {
    //   saveChat({ chatId: id, messages: finalMessages });
    // },
  });
}
