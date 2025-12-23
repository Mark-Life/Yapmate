import { z } from "zod";

/**
 * Stop chat input schema
 */
export const stopChatInputSchema = z.object({
  chatId: z.uuid(),
});

/**
 * Stop chat response schema
 */
export const stopChatResponseSchema = z.object({
  stopped: z.boolean(),
  reason: z.string().optional(),
});

export type StopChatInput = z.infer<typeof stopChatInputSchema>;
export type StopChatResponse = z.infer<typeof stopChatResponseSchema>;
