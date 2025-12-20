/**
 * Messages table - stores chat messages with ordering and metadata
 */
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { chats } from "./chats";
import { parts } from "./parts";

/** Valid message roles */
export const MESSAGE_ROLES = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/**
 * Metadata stored with assistant messages
 * Contains usage metrics, cost, and provider info
 */
export type MessageMetadata = {
  /** Number of tokens in the prompt */
  promptTokens?: number;
  /** Number of tokens in the completion */
  completionTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Cost in USD (if available from provider) */
  cost?: number;
  /** Why the generation stopped */
  finishReason?:
    | "stop"
    | "length"
    | "tool-calls"
    | "content-filter"
    | "error"
    | "unknown";
  /** Time to generate in milliseconds */
  latencyMs?: number;
  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
};

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Chat this message belongs to */
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    /** Message role: user, assistant, system, or tool */
    role: text().$type<MessageRole>().notNull(),
    /**
     * Model used to generate this message (for assistant messages)
     * Format: "provider/model-name" e.g. "openai/gpt-4o"
     */
    model: text(),
    /**
     * Position in chat, used for regenerate/branch operations
     * 0-indexed, sequential within a chat
     */
    order: integer().notNull(),
    /** Usage metrics, cost, and generation info */
    metadata: jsonb().$type<MessageMetadata>(),
    ...timestamps,
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    index("messages_chat_id_order_idx").on(table.chatId, table.order),
    index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
  ]
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  parts: many(parts),
}));

/** Insert type for messages table */
export type MessageInsert = typeof messages.$inferInsert;
/** Select type for messages table */
export type MessageSelect = typeof messages.$inferSelect;
