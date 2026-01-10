# MCP (Model Context Protocol) Integration Plan

## Overview

Enable users to configure their own MCP servers and select specific tools per-chat. This allows users to extend AI capabilities with custom tooling from HTTP/SSE MCP servers.

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

API keys stored encrypted with `mcp_server_id` as lookup key.

```sql
-- Using Supabase Vault functions
-- Key format: mcp_{server_id}
-- Value: JSON { "apiKey": "..." }

-- Insert secret
SELECT vault.create_secret(
  'mcp_' || server_id,
  jsonb_build_object('apiKey', api_key_value)::text
);

-- Read secret
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'mcp_' || server_id;

-- Delete secret
SELECT vault.delete_secret('mcp_' || server_id);
```

---

## TypeScript Types

### Drizzle Schema

```typescript
// packages/db/src/schema/mcp.ts

import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const mcpServers = pgTable(
  "mcp_servers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    transportType: text("transport_type").notNull().$type<"http" | "sse">(),
    authType: text("auth_type")
      .notNull()
      .$type<"bearer" | "api-key" | "none">(),
    authHeaderName: text("auth_header_name"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_servers_user_name_idx").on(table.userId, table.name),
    index("mcp_servers_user_id_idx").on(table.userId),
  ]
);

export const mcpTools = pgTable(
  "mcp_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    inputSchema: jsonb("input_schema").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_tools_server_tool_idx").on(
      table.mcpServerId,
      table.toolName
    ),
    index("mcp_tools_server_id_idx").on(table.mcpServerId),
  ]
);

export const chatMcpTools = pgTable(
  "chat_mcp_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(), // specific tool name or "*" for all
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
```

### Service Types

```typescript
// packages/server/src/services/mcp/types.ts

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
packages/server/src/services/mcp/
├── index.ts              # Public exports
├── types.ts              # Type definitions
├── mcp-server.service.ts # CRUD for MCP server configs
├── mcp-vault.service.ts  # Supabase Vault operations
├── mcp-tools.service.ts  # Tool discovery & caching
├── mcp-client.service.ts # MCP client creation & tool fetching
└── mcp-chat.service.ts   # Per-chat tool selection & runtime
```

### 1. `mcp-server.service.ts`

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

### 2. `mcp-vault.service.ts`

Secure API key storage using Supabase Vault.

```typescript
/** Store API key in vault */
export const storeMcpSecret = async (serverId: string, apiKey: string): Promise<void>

/** Get API key from vault */
export const getMcpSecret = async (serverId: string): Promise<string | null>

/** Delete API key from vault */
export const deleteMcpSecret = async (serverId: string): Promise<void>

/** Update API key in vault */
export const updateMcpSecret = async (serverId: string, apiKey: string): Promise<void>
```

### 3. `mcp-tools.service.ts`

Tool discovery and caching.

```typescript
/** Get cached tools for an MCP server */
export const getCachedTools = async (serverId: string): Promise<McpToolMeta[]>

/** Sync tools from MCP server (fetch & cache) */
export const syncMcpTools = async (serverId: string): Promise<McpToolMeta[]>

/** Clear cached tools for a server */
export const clearCachedTools = async (serverId: string): Promise<void>
```

### 4. `mcp-client.service.ts`

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

### 5. `mcp-chat.service.ts`

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

## API Endpoints (tRPC)

### Router Structure

```typescript
// packages/server/src/routes/mcp/index.ts

export const mcpRouter = router({
  // MCP Server CRUD
  servers: router({
    list: protectedProcedure.query(/* ... */),
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(/* ... */),
    create: protectedProcedure.input(addMcpServerSchema).mutation(/* ... */),
    update: protectedProcedure.input(updateMcpServerSchema).mutation(/* ... */),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(/* ... */),
    toggle: protectedProcedure
      .input(z.object({ id: z.string(), enabled: z.boolean() }))
      .mutation(/* ... */),
    test: protectedProcedure.input(testMcpServerSchema).mutation(/* ... */),
  }),

  // Tool Discovery
  tools: router({
    list: protectedProcedure
      .input(z.object({ serverId: z.string() }))
      .query(/* ... */),
    sync: protectedProcedure
      .input(z.object({ serverId: z.string() }))
      .mutation(/* ... */),
  }),

  // Chat Tool Selection
  chat: router({
    getSelections: protectedProcedure
      .input(z.object({ chatId: z.string() }))
      .query(/* ... */),
    setSelections: protectedProcedure
      .input(setChatSelectionsSchema)
      .mutation(/* ... */),
    addTool: protectedProcedure.input(addChatToolSchema).mutation(/* ... */),
    removeTool: protectedProcedure
      .input(removeChatToolSchema)
      .mutation(/* ... */),
  }),
});
```

### Validation Schemas

```typescript
// packages/server/src/routes/mcp/schemas.ts

export const addMcpServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const updateMcpServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  transportType: z.enum(["http", "sse"]).optional(),
  authType: z.enum(["bearer", "api-key", "none"]).optional(),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const testMcpServerSchema = z.object({
  url: z.string().url(),
  transportType: z.enum(["http", "sse"]),
  authType: z.enum(["bearer", "api-key", "none"]),
  authHeaderName: z.string().optional(),
  apiKey: z.string().optional(),
});

export const setChatSelectionsSchema = z.object({
  chatId: z.string().uuid(),
  selections: z.array(
    z.object({
      mcpServerId: z.string().uuid(),
      toolName: z.string(), // "*" for all tools
      enabled: z.boolean().default(true),
    })
  ),
});

export const addChatToolSchema = z.object({
  chatId: z.string().uuid(),
  mcpServerId: z.string().uuid(),
  toolName: z.string(),
});

export const removeChatToolSchema = z.object({
  chatId: z.string().uuid(),
  mcpServerId: z.string().uuid(),
  toolName: z.string(),
});
```

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

import { resolveChatMcpTools } from "../services/mcp";

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

### 1. Settings: MCP Servers List

**Location:** `apps/web/src/client/pages/settings/mcp-servers.tsx`

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

### 2. Settings: Add/Edit MCP Server Dialog

**Location:** `apps/web/src/client/components/mcp/mcp-server-dialog.tsx`

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

### 3. Chat: Tool Selector Popover

**Location:** `apps/web/src/client/components/chat/tool-selector.tsx`

Shown in chat input area, allows selecting tools for current chat.

```
┌──────────────────────────────────────────────┐
│ 🔧 Tools (3 selected)                   [▼]  │
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
│ [Select All]  [Deselect All]                 │
└──────────────────────────────────────────────┘
```

### 4. Chat: MCP Error Toast

When MCP server connection fails, show toast notification.

```
┌──────────────────────────────────────────────┐
│ ⚠️ MCP Connection Error                      │
│ Failed to connect to "GitHub MCP":           │
│ Connection timeout                           │
│                                   [Dismiss]  │
└──────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Data Layer (Est: 1-2 days)

- [ ] Create Drizzle schema for `mcp_servers`, `mcp_tools`, `chat_mcp_tools`
- [ ] Run migrations
- [ ] Implement `mcp-vault.service.ts` (Supabase Vault integration)
- [ ] Implement `mcp-server.service.ts` (CRUD operations)
- [ ] Write tests for data layer

### Phase 2: MCP Client Integration (Est: 1-2 days)

- [ ] Install `@ai-sdk/mcp` package
- [ ] Implement `mcp-client.service.ts` (client creation, tool fetching)
- [ ] Implement `mcp-tools.service.ts` (discovery & caching)
- [ ] Implement connection testing
- [ ] Write tests for MCP client operations

### Phase 3: API Layer (Est: 1 day)

- [ ] Create tRPC router for MCP operations
- [ ] Implement all endpoints (servers CRUD, tools, chat selections)
- [ ] Add validation schemas
- [ ] Write API tests

### Phase 4: Chat Integration (Est: 1 day)

- [ ] Implement `mcp-chat.service.ts` (runtime tool resolution)
- [ ] Modify `ai-response.ts` to accept MCP tools
- [ ] Modify chat route handler to resolve and inject tools
- [ ] Handle MCP errors in response stream
- [ ] Test end-to-end chat with MCP tools

### Phase 5: Settings UI (Est: 1-2 days)

- [ ] Create MCP servers list page
- [ ] Create Add/Edit MCP server dialog
- [ ] Implement connection testing UI
- [ ] Implement tool sync UI
- [ ] Add to settings navigation

### Phase 6: Chat UI (Est: 1-2 days)

- [ ] Create tool selector popover component
- [ ] Integrate into chat input area
- [ ] Implement tool selection persistence
- [ ] Show MCP errors as toasts
- [ ] Show active tools indicator

### Phase 7: Polish & Testing (Est: 1 day)

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
