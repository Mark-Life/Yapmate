/**
 * Parts table - normalized message parts
 *
 * Each message can have multiple parts (text, reasoning, tool calls, files, etc.)
 * Using normalized approach for better querying and type safety
 * Following Matt Pocock's pattern but with UUIDs
 */
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { files } from "./files";
import { messages } from "./messages";

/** Valid part types */
export const PART_TYPES = [
  "text",
  "reasoning",
  "source",
  "tool-invocation",
  "file",
] as const;
export type PartType = (typeof PART_TYPES)[number];

/** Tool invocation states */
export const TOOL_STATES = [
  "partial-call",
  "call",
  "result",
] as const;
export type ToolState = (typeof TOOL_STATES)[number];

export const parts = pgTable(
  "parts",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Message this part belongs to */
    messageId: uuid()
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    /** Part type discriminator */
    type: text().$type<PartType>().notNull(),
    /** Position within the message (0-indexed) */
    order: integer().notNull().default(0),

    // ─── Text Part ───────────────────────────────────────────────────────
    /** Text content (for type = 'text') */
    text_content: text(),

    // ─── Reasoning Part ──────────────────────────────────────────────────
    /** Reasoning/thinking content (for type = 'reasoning') */
    reasoning_content: text(),

    // ─── Source/Citation Part ────────────────────────────────────────────
    /** Source URL (for type = 'source') */
    source_url: text(),
    /** Source title (for type = 'source') */
    source_title: text(),

    // ─── Tool Invocation Part ────────────────────────────────────────────
    /** Tool call ID from AI SDK (for type = 'tool-invocation') */
    tool_callId: text(),
    /** Tool name (for type = 'tool-invocation') */
    tool_name: text(),
    /** Tool state: partial-call, call, result (for type = 'tool-invocation') */
    tool_state: text().$type<ToolState>(),
    /** Tool input arguments as JSON (for type = 'tool-invocation') */
    tool_input: jsonb(),
    /** Tool output/result as JSON (for type = 'tool-invocation') */
    tool_output: jsonb(),
    /** Tool error message if failed */
    tool_error: text(),

    // ─── File Part ───────────────────────────────────────────────────────
    /** Reference to files table (for type = 'file') */
    file_id: uuid().references(() => files.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    // Indexes
    index("parts_message_id_idx").on(t.messageId),
    index("parts_message_id_order_idx").on(t.messageId, t.order),
    index("parts_type_idx").on(t.type),
    index("parts_tool_call_id_idx").on(t.tool_callId),

    // ─── Check Constraints ─────────────────────────────────────────────────
    // Ensure required fields exist for each part type

    check(
      "text_content_required_if_type_is_text",
      sql`CASE WHEN ${t.type} = 'text' THEN ${t.text_content} IS NOT NULL ELSE TRUE END`
    ),

    check(
      "reasoning_content_required_if_type_is_reasoning",
      sql`CASE WHEN ${t.type} = 'reasoning' THEN ${t.reasoning_content} IS NOT NULL ELSE TRUE END`
    ),

    check(
      "source_fields_required_if_type_is_source",
      sql`CASE WHEN ${t.type} = 'source' THEN ${t.source_url} IS NOT NULL ELSE TRUE END`
    ),

    check(
      "tool_fields_required_if_type_is_tool",
      sql`CASE WHEN ${t.type} = 'tool-invocation' THEN ${t.tool_callId} IS NOT NULL AND ${t.tool_name} IS NOT NULL AND ${t.tool_state} IS NOT NULL ELSE TRUE END`
    ),

    check(
      "file_id_required_if_type_is_file",
      sql`CASE WHEN ${t.type} = 'file' THEN ${t.file_id} IS NOT NULL ELSE TRUE END`
    ),
  ]
);

export const partsRelations = relations(parts, ({ one }) => ({
  message: one(messages, {
    fields: [parts.messageId],
    references: [messages.id],
  }),
  file: one(files, {
    fields: [parts.file_id],
    references: [files.id],
  }),
}));

/** Insert type for parts table */
export type PartInsert = typeof parts.$inferInsert;
/** Select type for parts table */
export type PartSelect = typeof parts.$inferSelect;

