/**
 * Zod schemas generated from Drizzle ORM tables
 * Using drizzle-zod to ensure schemas stay in sync with database structure
 */
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { chats } from "./chats";

/**
 * Chat schemas
 */
export const chatSelectSchema = createSelectSchema(chats);
export const chatInsertSchema = createInsertSchema(chats);
export const chatUpdateSchema = createUpdateSchema(chats);

/**
 * Create chat input schema - only requires id, title is optional
 */
export const createChatInputSchema = chatInsertSchema
  .pick({
    id: true,
    title: true,
  })
  .partial({ title: true });

/**
 * Update chat input schema - requires id and title
 */
export const updateChatInputSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
});

/**
 * Delete chat input schema
 */
export const deleteChatInputSchema = z.object({
  id: z.uuid(),
});

/**
 * ChatUpdate type - inferred from update schema
 * Note: ChatSelect and ChatInsert types are already exported from ./chats.ts
 */
export type ChatUpdate = z.infer<typeof chatUpdateSchema>;
export type CreateChatInput = z.infer<typeof createChatInputSchema>;
export type UpdateChatInput = z.infer<typeof updateChatInputSchema>;
export type DeleteChatInput = z.infer<typeof deleteChatInputSchema>;
