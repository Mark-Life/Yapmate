/**
 * Usage records table - tracks API costs and token usage
 * Independent of message lifecycle (messages can be deleted without affecting usage)
 */
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

/** Valid usage record types */
export const USAGE_TYPES = ["chat", "title", "transcription", "agent"] as const;
export type UsageType = (typeof USAGE_TYPES)[number];

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** User who made the API call */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Context (nullable - depends on use case)
    /** Chat this usage belongs to (if applicable) */
    chatId: uuid().references(() => chats.id, { onDelete: "set null" }),
    /** Message ID (no FK - messages can be deleted without affecting usage) */
    messageId: uuid(),

    // What was called
    /** Type of usage: chat, title, transcription, agent, etc */
    type: text().$type<UsageType>().notNull(),
    /** Provider: openrouter, groq, anthropic, etc */
    provider: text(),
    /** Model identifier: e.g., "openai/gpt-4o" */
    model: text(),

    // Token usage
    /** Number of input tokens */
    inputTokens: integer(),
    /** Number of output tokens */
    outputTokens: integer(),
    /** Total tokens used */
    totalTokens: integer(),
    /** Cached tokens (if applicable) */
    cachedTokens: integer().default(0),
    /** Reasoning tokens (if applicable) */
    reasoningTokens: integer().default(0),

    // Cost
    /** Cost in USD (precision: 12 digits, 8 decimal places) */
    costUsd: numeric({ precision: 12, scale: 8 }),

    // Provider metadata
    /** Provider's generation ID (e.g., OpenRouter's gen-xxx) */
    generationId: text(),
    /** Finish reason: stop, length, tool-calls, etc */
    finishReason: text(),

    ...timestamps,
  },
  (table) => [
    index("usage_records_user_id_idx").on(table.userId),
    index("usage_records_user_id_created_at_idx").on(
      table.userId,
      table.createdAt
    ),
    index("usage_records_chat_id_idx").on(table.chatId),
  ]
);

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, {
    fields: [usageRecords.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [usageRecords.chatId],
    references: [chats.id],
  }),
}));

/** Insert type for usage_records table */
export type UsageRecordInsert = typeof usageRecords.$inferInsert;
/** Select type for usage_records table */
export type UsageRecordSelect = typeof usageRecords.$inferSelect;
