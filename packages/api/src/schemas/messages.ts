import { z } from "zod";

/**
 * Message schema - matches UIMessage from ai package
 * Using z.any() since UIMessage is complex and comes from the ai package
 * Type safety is maintained through TypeScript types
 */
export const messageSchema = z.any();

/**
 * List messages input schema
 */
export const listMessagesInputSchema = z.object({
  chatId: z.uuid(),
});

export type Message = z.infer<typeof messageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesInputSchema>;
