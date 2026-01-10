# MCP (Model Context Protocol) Integration Plan

## Overview

Enable users to configure their own MCP servers and select specific tools per-chat. This allows users to extend AI capabilities with custom tooling from HTTP/SSE MCP servers.

## Status

**Backend**: ✅ Complete (Phases 1-4)  
**Settings UI**: ✅ Complete (Phase 5)  
**Chat UI**: ✅ Complete (Phase 6)  
**Testing & Polish**: ⏳ Pending (Phase 7)

## Architecture Decisions

| Decision       | Choice            | Rationale                                  |
| -------------- | ----------------- | ------------------------------------------ |
| Transport      | HTTP/SSE only     | Browser-based app, no stdio support        |
| Tool caching   | Manual refresh    | MCP servers rarely add new tools           |
| Tool selection | Per-chat (DB)     | Persistent, shareable across sessions      |
| Connections    | Fresh per request | Simpler, no connection pool management     |
| Error handling | Show to user      | Transparency, user can fix config issues   |
| Secret storage | Supabase Vault    | Built-in encryption, secure key management |

---

## Data Model

### 1. `mcp_servers` table

Stores user's MCP server configurations (no secrets).

```sql
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  transport_type TEXT NOT NULL CHECK (transport_type IN ('http', 'sse')),
  auth_type TEXT NOT NULL CHECK (auth_type IN ('bearer', 'api-key', 'none')),
  auth_header_name TEXT, -- e.g., "X-API-Key" or "Authorization"
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, name)
);

-- Index for fetching user's servers
CREATE INDEX idx_mcp_servers_user_id ON mcp_servers(user_id);
```

### 2. `mcp_tools` table (cache)

Caches discovered tools from MCP servers.

```sql
CREATE TABLE mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,           -- MCP tool identifier
  display_name TEXT NOT NULL,        -- Human-readable name
  description TEXT,
  input_schema JSONB NOT NULL,       -- Tool's input schema
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (mcp_server_id, tool_name)
);

-- Index for fetching tools by server
CREATE INDEX idx_mcp_tools_server_id ON mcp_tools(mcp_server_id);
```

### 3. `chat_mcp_tools` table

Per-chat tool selections.

```sql
CREATE TABLE chat_mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,           -- Specific tool, or '*' for all tools
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chat_id, mcp_server_id, tool_name)
);

-- Index for fetching chat's tool selections
CREATE INDEX idx_chat_mcp_tools_chat_id ON chat_mcp_tools(chat_id);
```

### 4. Supabase Vault (secrets)

API keys stored encrypted using the vault service (`packages/db/src/service/vault.ts`).

**Key format**: `mcp-{userId}-{serverId}`

**Implementation**: The vault service provides core functions (`createSecret`, `getSecret`, `deleteSecret`) and MCP-specific convenience functions:

- `getMcpSecretName(userId, serverId)` - Generates secret name
- `getMcpSecret(userId, serverId)` - Retrieves API key
- `setMcpSecret(userId, serverId, apiKey)` - Stores API key
- `deleteMcpSecret(userId, serverId)` - Deletes API key

The service uses Supabase Vault's PostgreSQL functions:

- `vault.create_secret(value, name)` - Creates/updates secrets
- `vault.decrypted_secrets` view - Reads decrypted secrets
- Direct DELETE from `vault.secrets` table - Deletes secrets

---

## TypeScript Types

### Drizzle Schema

**Location**: `packages/db/src/schema/mcp.ts`

The schema includes all three tables with relations, type exports, and Zod validation schemas co-located in a single file.

```typescript
// packages/db/src/schema/mcp.ts

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

export const mcpServers = pgTable(
  "mcp_servers",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    url: text().notNull(),
    transportType: text().$type<McpTransportType>().notNull(),
    authType: text().$type<McpAuthType>().notNull(),
    authHeaderName: text(),
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

export const mcpTools = pgTable(
  "mcp_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    mcpServerId: uuid()
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text().notNull(),
    displayName: text().notNull(),
    description: text(),
    inputSchema: jsonb().notNull(),
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

export const chatMcpTools = pgTable(
  "chat_mcp_tools",
  {
    id: uuid().primaryKey().defaultRandom(),
    chatId: uuid()
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    mcpServerId: uuid()
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text().notNull(), // specific name or "*" for all
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

/** Insert/Select types exported for each table */
export type McpServerInsert = typeof mcpServers.$inferInsert;
export type McpServerSelect = typeof mcpServers.$inferSelect;
export type McpToolInsert = typeof mcpTools.$inferInsert;
export type McpToolSelect = typeof mcpTools.$inferSelect;
export type ChatMcpToolInsert = typeof chatMcpTools.$inferInsert;
export type ChatMcpToolSelect = typeof chatMcpTools.$inferSelect;

// Zod schemas (co-located in same file)
export const mcpServerSelectSchema = createSelectSchema(mcpServers);
export const mcpServerInsertSchema = createInsertSchema(mcpServers);
export const mcpServerUpdateSchema = createUpdateSchema(mcpServers);

export const addMcpServerInputSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const updateMcpServerInputSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  transportType: z.enum(["http", "sse"]).optional(),
  authType: z.enum(["bearer", "api-key", "none"]).optional(),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const testMcpServerInputSchema = z.object({
  url: z.url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const chatToolSelectionSchema = z.object({
  mcpServerId: z.uuid(),
  toolName: z.string(), // specific name or "*" for all
  enabled: z.boolean().default(true),
});

export const setChatToolSelectionsInputSchema = z.object({
  chatId: z.uuid(),
  selections: z.array(chatToolSelectionSchema),
});

export const addChatToolInputSchema = z.object({
  chatId: z.uuid(),
  mcpServerId: z.uuid(),
  toolName: z.string(),
});

export const removeChatToolInputSchema = z.object({
  chatId: z.uuid(),
  mcpServerId: z.uuid(),
  toolName: z.string(),
});
```

### Service Types

```typescript
// packages/server/src/lib/mcp/types.ts

/** MCP server configuration (without secrets) */
export type McpServerConfig = {
  id: string;
  userId: string;
  name: string;
  url: string;
  transportType: "http" | "sse";
  authType: "bearer" | "api-key" | "none";
  authHeaderName: string | null;
  enabled: boolean;
};

/** MCP server with resolved secrets (for runtime use) */
export type McpServerWithSecrets = McpServerConfig & {
  apiKey: string | null;
};

/** Cached tool metadata */
export type McpToolMeta = {
  id: string;
  mcpServerId: string;
  toolName: string;
  displayName: string;
  description: string | null;
  inputSchema: Record<string, unknown>;
  lastSyncedAt: Date;
};

/** Tool selection for a chat */
export type ChatToolSelection = {
  mcpServerId: string;
  toolName: string; // specific name or "*"
  enabled: boolean;
};

/** Input for adding new MCP server */
export type AddMcpServerInput = {
  name: string;
  url: string;
  transportType: "http" | "sse";
  authType: "bearer" | "api-key" | "none";
  authHeaderName?: string;
  apiKey?: string;
};

/** Result of testing MCP connection */
export type McpConnectionTestResult = {
  success: boolean;
  error?: string;
  toolCount?: number;
  tools?: Array<{ name: string; description?: string }>;
};
```

---

## Service Layer

### File Structure

```
packages/server/src/lib/mcp/
├── index.ts    # Public exports
├── types.ts     # Type definitions
├── server.ts    # CRUD for MCP server configs
├── tools.ts     # Tool discovery & caching (includes fetchAndSyncMcpTools)
├── client.ts   # MCP client creation & tool fetching
└── chat.ts      # Per-chat tool selection & runtime

packages/api/src/routers/
└── mcp.ts       # oRPC router for MCP operations

packages/db/src/schema/
└── mcp.ts       # Drizzle schema + Zod validation schemas
```

### 1. `server.ts`

CRUD operations for MCP server configurations.

```typescript
/** Get all MCP servers for a user */
export const getUserMcpServers = async (userId: string): Promise<McpServerConfig[]>

/** Get single MCP server by ID (validates ownership) */
export const getMcpServer = async (userId: string, serverId: string): Promise<McpServerConfig | null>

/** Add new MCP server (also stores API key in vault) */
export const addMcpServer = async (userId: string, input: AddMcpServerInput): Promise<McpServerConfig>

/** Update MCP server config */
export const updateMcpServer = async (
  userId: string,
  serverId: string,
  input: Partial<AddMcpServerInput>
): Promise<McpServerConfig>

/** Delete MCP server (cascades to tools, chat selections, vault secret) */
export const deleteMcpServer = async (userId: string, serverId: string): Promise<void>

/** Toggle MCP server enabled/disabled */
export const toggleMcpServer = async (userId: string, serverId: string, enabled: boolean): Promise<void>
```

### 2. Vault Operations

Secure API key storage using Supabase Vault. Vault functions are implemented directly in `packages/db/src/service/vault.ts` and used throughout the MCP service layer.

**Note**: No separate `vault.ts` wrapper file needed - vault functions are imported directly from `@yapmate/db/service`:

- `getMcpSecret(userId, serverId)` - Retrieves API key
- `setMcpSecret(userId, serverId, apiKey)` - Stores API key
- `deleteMcpSecret(userId, serverId)` - Deletes API key

### 3. `tools.ts`

Tool discovery and caching.

```typescript
/** Get cached tools for an MCP server */
export const getCachedTools = async (serverId: string): Promise<McpToolMeta[]>

/** Sync tools from MCP server (fetch & cache) */
export const syncMcpTools = async (
  serverId: string,
  tools: Array<{
    toolName: string;
    displayName: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>
): Promise<McpToolMeta[]>

/** Fetch tools from MCP server and sync to cache */
export const fetchAndSyncMcpTools = async (
  userId: string,
  serverId: string
): Promise<McpToolMeta[]>

/** Clear cached tools for a server */
export const clearCachedTools = async (serverId: string): Promise<void>
```

### 4. `client.ts`

MCP client lifecycle and tool fetching.

```typescript
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

/** Create MCP client from server config */
export const createMcpClientFromConfig = async (
  config: McpServerWithSecrets
): Promise<MCPClient>

/** Test MCP connection and return available tools */
export const testMcpConnection = async (
  config: McpServerWithSecrets
): Promise<McpConnectionTestResult>

/** Fetch tools from MCP client (filtered by selection) */
export const fetchMcpTools = async (
  client: MCPClient,
  selectedTools?: string[] // undefined = all tools
): Promise<Record<string, unknown>> // AI SDK tool format
```

### 5. `chat.ts`

Per-chat tool selection and runtime tool resolution.

```typescript
/** Get tool selections for a chat */
export const getChatToolSelections = async (chatId: string): Promise<ChatToolSelection[]>

/** Set tool selections for a chat (replaces existing) */
export const setChatToolSelections = async (
  chatId: string,
  selections: ChatToolSelection[]
): Promise<void>

/** Add tool selection to chat */
export const addChatToolSelection = async (
  chatId: string,
  selection: Omit<ChatToolSelection, "enabled"> & { enabled?: boolean }
): Promise<void>

/** Remove tool selection from chat */
export const removeChatToolSelection = async (
  chatId: string,
  mcpServerId: string,
  toolName: string
): Promise<void>

/**
 * Resolve tools for chat request
 * Creates MCP clients, fetches selected tools, returns merged tools object
 */
export const resolveChatMcpTools = async (
  userId: string,
  chatId: string
): Promise<{
  tools: Record<string, unknown>;
  clients: MCPClient[];
  errors: Array<{ serverId: string; serverName: string; error: string }>;
}>
```

---

## API Endpoints (oRPC)

### Router Structure

**Location**: `packages/api/src/routers/mcp.ts`

All schemas are imported directly from `@yapmate/db/schema` (no separate schemas file).

```typescript
// packages/api/src/routers/mcp.ts

export const mcp = {
  // MCP Server CRUD
  servers: {
    list: protectedProcedure.output(...).handler(...),
    get: protectedProcedure.input(...).output(...).handler(...),
    create: protectedProcedure.input(...).output(...).handler(...),
    update: protectedProcedure.input(...).output(...).handler(...),
    delete: protectedProcedure.input(...).output(...).handler(...),
    toggle: protectedProcedure.input(...).output(...).handler(...),
    test: protectedProcedure.input(...).output(...).handler(...),
  },

  // Tool Discovery
  tools: {
    list: protectedProcedure.input(...).output(...).handler(...),
    sync: protectedProcedure.input(...).output(...).handler(...),
  },

  // Chat Tool Selection
  chat: {
    getSelections: protectedProcedure.input(...).output(...).handler(...),
    setSelections: protectedProcedure.input(...).output(...).handler(...),
    addTool: protectedProcedure.input(...).output(...).handler(...),
    removeTool: protectedProcedure.input(...).output(...).handler(...),
  },
};
```

### Validation Schemas

All schemas are defined in `packages/db/src/schema/mcp.ts` and imported directly:

- `addMcpServerInputSchema` - Create server input
- `updateMcpServerInputSchema` - Update server input
- `testMcpServerInputSchema` - Test connection input
- `setChatToolSelectionsInputSchema` - Set chat tool selections
- `addChatToolInputSchema` - Add single tool to chat
- `removeChatToolInputSchema` - Remove tool from chat
- `chatToolSelectionSchema` - Single tool selection
- `mcpServerSelectSchema` - Server output schema
- `mcpToolSelectSchema` - Tool output schema

---

## Chat Integration

### Modify `ai-response.ts`

```typescript
// packages/server/src/routes/api/chat/ai-response.ts

type ExecuteAiResponseOptions = {
  // ... existing fields ...
  mcpTools?: Record<string, unknown>;
  onMcpError?: (
    errors: Array<{ serverId: string; serverName: string; error: string }>
  ) => void;
};

export const executeAiResponse = async (
  options: ExecuteAiResponseOptions
): Promise<AiResponseResult> => {
  const { mcpTools, ...rest } = options;

  const result = streamText({
    model: baseModel,
    messages: await convertToModelMessages(messages),
    tools: mcpTools, // <-- inject MCP tools
    system: baseSystemPrompt,
    maxOutputTokens: 8192,
    abortSignal,
    stopWhen: stepCountIs(5),
  });

  // ... rest of implementation
};
```

### Modify Chat Route Handler

```typescript
// In chat route handler

import { resolveChatMcpTools } from "../../lib/mcp";

// Before calling executeAiResponse:
const {
  tools: mcpTools,
  clients: mcpClients,
  errors: mcpErrors,
} = await resolveChatMcpTools(userId, chatId);

// Send MCP errors to client via stream metadata
if (mcpErrors.length > 0) {
  // Include in stream response somehow (custom data or initial message)
}

const { uiStream, getUsage } = await executeAiResponse({
  // ... other options ...
  mcpTools,
});

// Close MCP clients when stream finishes
const originalStream = uiStream;
// Wrap stream to close clients on finish
// Or use onFinish callback if available
```

---

## UI Components

### 1. Settings: MCP Servers List ✅ COMPLETE

**Location:** `apps/web/src/client/pages/settings/mcp-servers-section.tsx`

**Implementation Notes:**

- Displays all configured MCP servers in a card grid layout
- Shows server name, URL, transport type badge, tool count, and last sync time
- Toggle switch to enable/disable servers
- Sync button to refresh tools from server
- Edit and Delete actions for each server
- Empty state when no servers are configured
- Loading states and error handling with toast notifications

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Servers                                    [+ Add New]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Context7                                    [Toggle: ON]│ │
│ │ https://mcp.context7.com/mcp                            │ │
│ │ 2 tools • Last synced: 2 hours ago                      │ │
│ │                              [Sync] [Edit] [Delete]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ GitHub MCP                                 [Toggle: OFF]│ │
│ │ https://mcp.github.example.com                          │ │
│ │ 5 tools • Last synced: 1 day ago                        │ │
│ │                              [Sync] [Edit] [Delete]     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Settings: Add/Edit MCP Server Dialog ✅ COMPLETE

**Location:** `apps/web/src/client/pages/settings/mcp-server-dialog.tsx`

**Implementation Notes:**

- Form fields: Name, URL, Transport type (HTTP/SSE), Auth type (None/Bearer/API Key)
- Conditional auth header name field for API Key auth type
- Password input for API keys (never shows existing keys when editing)
- "Test Connection" button with real-time feedback
- Test result display showing success/error, tool count, and available tools list
- Form validation with error messages
- Loading states for test and save operations
- Supports both create and edit modes
- Extracted `TestResultDisplay` component for better code organization

```
┌─────────────────────────────────────────────────────────────┐
│ Add MCP Server                                          [X] │
├─────────────────────────────────────────────────────────────┤
│ Name *                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Context7                                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ URL *                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ https://mcp.context7.com/mcp                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Transport                                                   │
│ (●) HTTP    ( ) SSE                                         │
│                                                             │
│ Authentication                                              │
│ ( ) None    (●) Bearer Token    ( ) API Key Header          │
│                                                             │
│ API Key                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ••••••••••••••••••••                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ Connection successful! Found 2 tools.                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                      [Test Connection]  [Cancel]  [Save]    │
└─────────────────────────────────────────────────────────────┘
```

### 3. Chat: Tool Selector Popover ✅ COMPLETE

**Location:** `apps/web/src/client/components/chat/tool-selector.tsx`

**Implementation Notes:**

- Shown in chat input toolbar (desktop and mobile)
- Wrench icon button with badge showing selected count
- Popover with search input and hierarchical server/tools view
- Server-level checkbox selects all tools (uses `*` wildcard)
- Individual tool checkboxes with descriptions
- Loading states, empty states for no servers/tools/matches
- Disabled when no chatId (new chat not yet created)
- Hotkey: `mod+alt+p` to open
- Uses existing `mcp.chat.*` API endpoints for persistence

```
┌──────────────────────────────────────────────┐
│ 🔧 Tools (3)                            [▼]  │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ Search tools...                              │
├──────────────────────────────────────────────┤
│ ▼ Context7                              [☑]  │
│   ├─ ☑ resolve-library-id                    │
│   │    Resolve library name to ID            │
│   └─ ☑ get-library-docs                      │
│        Get documentation for library         │
│                                              │
│ ▼ GitHub MCP                            [☐]  │
│   ├─ ☐ create-issue                          │
│   ├─ ☐ search-repos                          │
│   └─ ☐ get-file-contents                     │
├──────────────────────────────────────────────┤
│ Selected tools will be available to the AI   │
└──────────────────────────────────────────────┘
```

### 4. Chat: MCP Error Toast ✅ COMPLETE

**Implementation Notes:**

- Handled in `chat.tsx` via `onData` callback
- Listens for `data-mcp-error` stream chunks from backend
- Displays toast with server name and error message (8s duration)
- Multiple errors shown as separate toasts

```
┌──────────────────────────────────────────────┐
│ ⚠️ MCP Error: GitHub MCP                     │
│ Connection timeout                           │
│                                   [Dismiss]  │
└──────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Data Layer ✅ COMPLETE

- [x] Create Drizzle schema for `mcp_servers`, `mcp_tools`, `chat_mcp_tools` - **COMPLETE**
- [ ] Run migrations - **PENDING** (schema ready, migrations need to be generated and run)
- [x] Implement vault service (`packages/db/src/service/vault.ts`) - **COMPLETE**
  - Core functions: `createSecret`, `getSecret`, `deleteSecret`
  - MCP-specific functions: `getMcpSecret`, `setMcpSecret`, `deleteMcpSecret`
- [x] Implement `server.ts` (CRUD operations) - **COMPLETE**
- [x] Implement `tools.ts` (discovery & caching) - **COMPLETE**
  - Includes `fetchAndSyncMcpTools` helper for fetching and caching tools
- [ ] Write tests for data layer - **PENDING**

### Phase 2: MCP Client Integration ✅ COMPLETE

- [x] Install `@ai-sdk/mcp` package
- [x] Implement `client.ts` (client creation, tool fetching) - **COMPLETE**
  - `createMcpClientFromConfig` - Creates MCP client from server config
  - `testMcpConnection` - Tests connection and returns available tools
  - `fetchMcpTools` - Fetches tools from client (with optional filtering)
- [x] Implement `tools.ts` (discovery & caching) - **COMPLETE**
  - `getCachedTools` - Gets cached tools
  - `syncMcpTools` - Syncs provided tools to cache
  - `fetchAndSyncMcpTools` - Fetches from server and syncs to cache
  - `clearCachedTools` - Clears cached tools
- [x] Implement connection testing - **COMPLETE**
- [ ] Write tests for MCP client operations

### Phase 3: API Layer ✅ COMPLETE

- [x] Create oRPC router for MCP operations (`packages/api/src/routers/mcp.ts`) - **COMPLETE**
- [x] Implement all endpoints (servers CRUD, tools, chat selections) - **COMPLETE**
  - `mcp.servers.list` - List user's MCP servers
  - `mcp.servers.get` - Get single server
  - `mcp.servers.create` - Create new server
  - `mcp.servers.update` - Update server config
  - `mcp.servers.delete` - Delete server
  - `mcp.servers.toggle` - Toggle enabled/disabled
  - `mcp.servers.test` - Test connection (without saving)
  - `mcp.tools.list` - List cached tools for server
  - `mcp.tools.sync` - Fetch and sync tools from server
  - `mcp.chat.getSelections` - Get tool selections for chat
  - `mcp.chat.setSelections` - Set tool selections (replaces existing)
  - `mcp.chat.addTool` - Add tool selection to chat
  - `mcp.chat.removeTool` - Remove tool selection from chat
- [x] Add validation schemas - **COMPLETE** (imported from `@yapmate/db/schema`)
- [x] Integrated into main router (`packages/api/src/router.ts`) - **COMPLETE**
- [ ] Write API tests

### Phase 4: Chat Integration ✅ COMPLETE

- [x] Implement `chat.ts` (runtime tool resolution) - **COMPLETE**
  - `getChatToolSelections` - Get selections for chat
  - `setChatToolSelections` - Set selections (replaces existing)
  - `addChatToolSelection` - Add single selection
  - `removeChatToolSelection` - Remove selection
  - `resolveChatMcpTools` - Resolve tools for chat request (creates clients, fetches tools, returns merged tools + errors)
- [x] Modify `ai-response.ts` to accept MCP tools - **COMPLETE**
- [x] Modify chat route handler to resolve and inject tools - **COMPLETE**
- [x] Handle MCP errors in response stream - **COMPLETE** (sent as `data-mcp-error` chunks)
- [x] Close MCP clients after stream finishes - **COMPLETE** (in finally block)
- [ ] Test end-to-end chat with MCP tools

### Phase 5: Settings UI ✅ COMPLETE

- [x] Create MCP servers list page - **COMPLETE** (`apps/web/src/client/pages/settings/mcp-servers-section.tsx`)
- [x] Create Add/Edit MCP server dialog - **COMPLETE** (`apps/web/src/client/pages/settings/mcp-server-dialog.tsx`)
- [x] Implement connection testing UI - **COMPLETE** (integrated into dialog with real-time feedback)
- [x] Implement tool sync UI - **COMPLETE** (sync button on each server card)
- [x] Add to settings navigation - **COMPLETE** (added "MCP Servers" section to settings layout)

### Phase 6: Chat UI ✅ COMPLETE

- [x] Create tool selector popover component - **COMPLETE** (`apps/web/src/client/components/chat/tool-selector.tsx`)
  - Hierarchical view with servers and tools
  - Server-level checkbox (selects all tools via `*` wildcard)
  - Individual tool checkboxes
  - Search/filter functionality
  - Loading states and empty states
- [x] Integrate into chat input area - **COMPLETE** (modified `chat-input.tsx`)
  - Added ToolSelector component to toolbar (desktop & mobile)
  - Added hotkey `mod+alt+p` for quick access
- [x] Implement tool selection persistence - **COMPLETE**
  - Uses `mcp.chat.addTool`, `mcp.chat.removeTool`, `mcp.chat.getSelections` APIs
  - Selections stored per-chat in `chat_mcp_tools` table
- [x] Show MCP errors as toasts - **COMPLETE** (modified `chat.tsx`)
  - Handles `data-mcp-error` stream chunks
  - Displays toast for each failed MCP server connection
- [x] Show active tools indicator - **COMPLETE**
  - Badge showing count of selected tools on the wrench icon

### Phase 7: Polish & Testing

- [ ] End-to-end testing with real MCP servers
- [ ] Error handling edge cases
- [ ] Loading states and optimistic updates
- [ ] Documentation

---

## Security Considerations

1. **API Key Storage**: All API keys stored in Supabase Vault, never in plain DB columns
2. **User Isolation**: MCP servers scoped to user, verified on every operation
3. **URL Validation**: Validate MCP URLs (HTTPS only in production?)
4. **Rate Limiting**: Consider rate limiting MCP server additions
5. **Tool Execution**: MCP tools execute on server, results go to AI - user cannot directly invoke

---

## Future Enhancements

- [ ] MCP server templates (pre-configured popular servers)
- [ ] Tool usage analytics
- [ ] Tool recommendations based on conversation
- [ ] Shared MCP configs (team feature)
- [ ] OAuth support for MCP servers
- [ ] WebSocket transport support
- [ ] Tool execution history/logs

---

## Dependencies

```json
{
  "@ai-sdk/mcp": "^latest",
  "@modelcontextprotocol/sdk": "^latest"
}
```

---

## References

- [AI SDK MCP Documentation](/docs/ai-sdk/core/mcp.md)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault)
- Vault Service Implementation: `packages/db/src/service/vault.ts`
  - Core functions: `createSecret`, `getSecret`, `deleteSecret`
  - MCP functions: `getMcpSecret`, `setMcpSecret`, `deleteMcpSecret`, `getMcpSecretName`
