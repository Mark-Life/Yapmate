/**
 * Chat members table - tracks users participating in multi-user chats
 */
import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

/** Valid member roles */
export const MEMBER_ROLES = ["owner", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const chatMembers = pgTable(
  "chat_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Chat this membership belongs to */
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    /** User who is a member */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Role in this chat: owner or member */
    role: text().$type<MemberRole>().notNull().default("member"),
    /** Display name in this chat (required for multi-user) */
    displayName: text().notNull(),
    ...timestamps,
  },
  (table) => [
    index("chat_members_chat_id_idx").on(table.chatId),
    index("chat_members_user_id_idx").on(table.userId),
    // Unique constraint: user can only be member once per chat
    unique("chat_members_chat_user_unique").on(table.chatId, table.userId),
  ]
);

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [chatMembers.userId],
    references: [users.id],
  }),
}));

/** Insert type for chat_members table */
export type ChatMemberInsert = typeof chatMembers.$inferInsert;
/** Select type for chat_members table */
export type ChatMemberSelect = typeof chatMembers.$inferSelect;
