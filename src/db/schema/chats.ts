/**
 * Chats table - stores chat sessions with branching support
 */
import { relations } from "drizzle-orm";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
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
    ...timestamps,
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    index("chats_parent_chat_id_idx").on(table.parentChatId),
  ]
);

export const chatsRelations = relations(chats, ({ one }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  parentChat: one(chats, {
    fields: [chats.parentChatId],
    references: [chats.id],
    relationName: "branches",
  }),
}));

/** Insert type for chats table */
export type ChatInsert = typeof chats.$inferInsert;
/** Select type for chats table */
export type ChatSelect = typeof chats.$inferSelect;
