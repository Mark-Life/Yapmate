/**
 * Chats table - stores chat sessions with branching support
 */
import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { chatMembers } from "./chat-members";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

export const chats = pgTable(
  "chats",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Owner of this chat */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Chat title (auto-generated or user-defined) */
    title: text(),
    /**
     * For branched chats: reference to the original chat
     * null for original chats
     */
    parentChatId: uuid(),
    /**
     * For branched chats: the message ID from which this chat branched
     * null for original chats
     */
    branchPointMessageId: uuid(),
    /**
     * Active stream ID for resumable streams (Phase 2)
     * null when no stream is active
     */
    activeStreamId: text(),
    /** Whether this chat has multiple users */
    isMultiUser: boolean().default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("chats_parent_chat_id_idx").on(table.parentChatId),
  ]
);

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  parentChat: one(chats, {
    fields: [chats.parentChatId],
    references: [chats.id],
    relationName: "branches",
  }),
  members: many(chatMembers),
}));

/** Insert type for chats table */
export type ChatInsert = typeof chats.$inferInsert;
/** Select type for chats table */
export type ChatSelect = typeof chats.$inferSelect;

// Zod

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
