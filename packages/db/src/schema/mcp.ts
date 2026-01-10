/**
 * MCP (Model Context Protocol) tables
 * - mcpServers: user's MCP server configurations
 * - mcpTools: cached tools discovered from servers
 * - chatMcpTools: per-chat tool selections
 */
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { chats } from "./chats";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

/** Transport types for MCP connections */
export type McpTransportType = "http" | "sse";

/** Authentication types for MCP servers */
export type McpAuthType = "bearer" | "api-key" | "none";

/**
 * MCP Servers table - stores user's MCP server configurations (no secrets)
 * API keys stored separately in Supabase Vault
 */
export const mcpServers = pgTable(
  "mcp_servers",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Owner of this MCP server config */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Human-readable name for the server */
    name: text().notNull(),
    /** Server URL endpoint */
    url: text().notNull(),
    /** Transport protocol: 'http' or 'sse' */
    transportType: text().$type<McpTransportType>().notNull(),
    /** Authentication method: 'bearer', 'api-key', or 'none' */
    authType: text().$type<McpAuthType>().notNull(),
    /** Custom header name for auth (e.g., "X-API-Key" or "Authorization") */
    authHeaderName: text(),
    /** Whether this server is active */
    enabled: boolean().notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mcp_servers_user_name_idx").on(table.userId, table.name),
    index("mcp_servers_user_id_idx").on(table.userId),
  ]
);

export const mcpServersRelations = relations(mcpServers, ({ one, many }) => ({
  user: one(users, {
    fields: [mcpServers.userId],
    references: [users.id],
  }),
  tools: many(mcpTools),
  chatTools: many(chatMcpTools),
}));

/**
 * MCP Tools table - caches discovered tools from MCP servers
 */
export const mcpTools = pgTable(
  "mcp_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Parent MCP server */
    mcpServerId: uuid()
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    /** MCP tool identifier */
    toolName: text().notNull(),
    /** Human-readable name */
    displayName: text().notNull(),
    /** Tool description */
    description: text(),
    /** Tool's JSON input schema */
    inputSchema: jsonb().notNull(),
    /** When tools were last fetched from server */
    lastSyncedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_tools_server_tool_idx").on(
      table.mcpServerId,
      table.toolName
    ),
    index("mcp_tools_server_id_idx").on(table.mcpServerId),
  ]
);

export const mcpToolsRelations = relations(mcpTools, ({ one }) => ({
  server: one(mcpServers, {
    fields: [mcpTools.mcpServerId],
    references: [mcpServers.id],
  }),
}));

// ==============================

/**
 * Chat MCP Tools table - per-chat tool selections
 */
export const chatMcpTools = pgTable(
  "chat_mcp_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Chat this selection belongs to */
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    /** MCP server providing the tool */
    mcpServerId: uuid()
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    /** Specific tool name, or '*' for all tools from server */
    toolName: text().notNull(),
    /** Whether this tool selection is active */
    enabled: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_mcp_tools_unique_idx").on(
      table.chatId,
      table.mcpServerId,
      table.toolName
    ),
    index("chat_mcp_tools_chat_id_idx").on(table.chatId),
  ]
);

export const chatMcpToolsRelations = relations(chatMcpTools, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMcpTools.chatId],
    references: [chats.id],
  }),
  server: one(mcpServers, {
    fields: [chatMcpTools.mcpServerId],
    references: [mcpServers.id],
  }),
}));

/** Insert type for mcp_servers table */
export type McpServerInsert = typeof mcpServers.$inferInsert;
/** Select type for mcp_servers table */
export type McpServerSelect = typeof mcpServers.$inferSelect;

/** Insert type for mcp_tools table */
export type McpToolInsert = typeof mcpTools.$inferInsert;
/** Select type for mcp_tools table */
export type McpToolSelect = typeof mcpTools.$inferSelect;

/** Insert type for chat_mcp_tools table */
export type ChatMcpToolInsert = typeof chatMcpTools.$inferInsert;
/** Select type for chat_mcp_tools table */
export type ChatMcpToolSelect = typeof chatMcpTools.$inferSelect;

// Zod

/**
 * MCP Server schemas
 */
export const mcpServerSelectSchema = createSelectSchema(mcpServers);
export const mcpServerInsertSchema = createInsertSchema(mcpServers);
export const mcpServerUpdateSchema = createUpdateSchema(mcpServers);

/** Input for adding new MCP server (with optional apiKey for vault storage) */
export const addMcpServerInputSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

/** Input for updating MCP server */
export const updateMcpServerInputSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  transportType: z.enum(["http", "sse"]).optional(),
  authType: z.enum(["bearer", "api-key", "none"]).optional(),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

/** Input for testing MCP connection */
export const testMcpServerInputSchema = z.object({
  url: z.url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export type AddMcpServerInput = z.infer<typeof addMcpServerInputSchema>;
export type UpdateMcpServerInput = z.infer<typeof updateMcpServerInputSchema>;
export type TestMcpServerInput = z.infer<typeof testMcpServerInputSchema>;

/**
 * MCP Tool schemas
 */
export const mcpToolSelectSchema = createSelectSchema(mcpTools);
export const mcpToolInsertSchema = createInsertSchema(mcpTools);

/**
 * Chat MCP Tool schemas
 */
export const chatMcpToolSelectSchema = createSelectSchema(chatMcpTools);
export const chatMcpToolInsertSchema = createInsertSchema(chatMcpTools);

/** Single tool selection for a chat */
export const chatToolSelectionSchema = z.object({
  mcpServerId: z.uuid(),
  toolName: z.string(), // specific name or "*" for all
  enabled: z.boolean().default(true),
});

/** Input for setting all tool selections for a chat */
export const setChatToolSelectionsInputSchema = z.object({
  chatId: z.uuid(),
  selections: z.array(chatToolSelectionSchema),
});

/** Input for adding single tool to chat */
export const addChatToolInputSchema = z.object({
  chatId: z.uuid(),
  mcpServerId: z.uuid(),
  toolName: z.string(),
});

/** Input for removing tool from chat */
export const removeChatToolInputSchema = z.object({
  chatId: z.uuid(),
  mcpServerId: z.uuid(),
  toolName: z.string(),
});

export type ChatToolSelection = z.infer<typeof chatToolSelectionSchema>;
export type SetChatToolSelectionsInput = z.infer<
  typeof setChatToolSelectionsInputSchema
>;
export type AddChatToolInput = z.infer<typeof addChatToolInputSchema>;
export type RemoveChatToolInput = z.infer<typeof removeChatToolInputSchema>;
