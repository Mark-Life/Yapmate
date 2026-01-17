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

/**
 * List batch messages input schema
 * Accepts array of chat IDs, limited to 20 max
 */
export const listBatchMessagesInputSchema = z.object({
  chatIds: z.array(z.uuid()).min(1).max(20),
});

/**
 * Sync messages input schema
 * Used to sync local (on-device) model messages to the database
 */
export const syncMessagesInputSchema = z.object({
  chatId: z.uuid(),
  messages: z.array(messageSchema),
  model: z.string().optional(),
});

export type Message = z.infer<typeof messageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesInputSchema>;
export type ListBatchMessagesInput = z.infer<
  typeof listBatchMessagesInputSchema
>;
export type SyncMessagesInput = z.infer<typeof syncMessagesInputSchema>;
