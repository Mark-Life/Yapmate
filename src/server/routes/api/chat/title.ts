/**
 * Chat title generation utilities
 */

import { streamText } from "ai";
import { openrouter } from "@/server/lib/openrouter";
import { publishStreamChunk } from "@/server/lib/redis/stream";
import { updateChatTitle } from "./store";

const TITLE_GENERATION_MODEL = "google/gemma-3n-e4b-it:free";
const MAX_TITLE_LENGTH = 50;

/**
 * Truncates text to max length with ellipsis
 */
export const truncateTitle = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
};

/**
 * Generates a chat title from the first user message
 */
export const generateChatTitle = async (
  userMessage: string
): Promise<string> => {
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
 * Options for generating and publishing title
 */
type GenerateTitleOptions = {
  chatId: string;
  streamId: string;
  userMessage: string;
  writer: Parameters<
    Parameters<typeof import("ai").createUIMessageStream>[0]["execute"]
  >[0]["writer"];
  chunkIndex: { current: number };
};

/**
 * Generates and publishes chat title to stream
 */
export const generateAndPublishTitle = async (
  options: GenerateTitleOptions
): Promise<void> => {
  const { chatId, streamId, userMessage, writer, chunkIndex } = options;
  const userText = userMessage || "New chat";
  try {
    const title = await generateChatTitle(userText);
    await updateChatTitle(chatId, title);
    const titleChunk = {
      type: "data-chat-title" as const,
      data: { title },
      transient: true,
    };
    writer.write(titleChunk);
    // Publish title to Redis
    await publishStreamChunk(streamId, {
      type: titleChunk.type,
      data: titleChunk.data,
      index: chunkIndex.current,
    });
    chunkIndex.current += 1;
  } catch (error) {
    console.error("Title generation failed:", error);
  }
};
