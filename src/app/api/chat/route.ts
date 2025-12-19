import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openrouter } from "@/lib/openrouter";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export async function POST(req: Request) {
  const {
    messages,
    model,
    searchEnabled,
  }: {
    messages: UIMessage[];
    model: string;
    searchEnabled?: boolean;
  } = await req.json();
  const modelWithSearch = searchEnabled ? `${model}:online` : model;
  const result = streamText({
    model: openrouter.chat(modelWithSearch),
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
  });
  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
