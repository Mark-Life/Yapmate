/**
 * Langfuse Web SDK client for frontend feedback collection
 */

import { LangfuseWeb } from "langfuse";

if (!process.env.PUBLIC_LANGFUSE_PUBLIC_KEY) {
  throw new Error("PUBLIC_LANGFUSE_PUBLIC_KEY is not set");
}
if (!process.env.PUBLIC_LANGFUSE_BASE_URL) {
  throw new Error("PUBLIC_LANGFUSE_BASE_URL is not set");
}

/**
 * Langfuse Web client instance for sending user feedback scores
 * Uses public key - safe to expose in frontend
 */
export const langfuseWeb = new LangfuseWeb({
  publicKey: process.env.PUBLIC_LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.PUBLIC_LANGFUSE_BASE_URL,
});

type FeedbackOptions = {
  traceId: string;
  value: 0 | 1;
  comment?: string;
};

/**
 * Sends user feedback score to Langfuse
 * traceId is the message ID (server creates one trace per assistant message)
 */
export const sendFeedback = async (options: FeedbackOptions): Promise<void> => {
  const { traceId, value, comment } = options;

  await langfuseWeb.score({
    traceId,
    name: "user-feedback",
    value,
    comment,
  });
};
