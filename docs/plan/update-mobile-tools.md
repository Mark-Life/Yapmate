# Mobile Tools Implementation Plan

Bring feature parity to mobile chat input. Server already supports all features - need UI, state, and API integration on mobile.

## Current State

| Feature | Web | Mobile | Priority |
|---------|-----|--------|----------|
| MCP Tools | ✅ | ❌ | High |
| AI Rules | ✅ | ❌ | High |
| Memory Toggle | ✅ | ❌ | Medium |
| Reasoning Depth | ✅ | ❌ | Medium |
| Token/Context Display | ✅ | ❌ | Low |

Already implemented on mobile: Model Selector, Search Toggle, Voice Transcription, Attachments, Message Edit/Regenerate.

---

## 1. Memory Toggle

**Simplest to implement** - boolean toggle, no complex UI.

### Web Implementation

**UI**: `apps/web/src/client/components/chat/chat-input.tsx` (lines 346-361)
- Toggle button with DatabaseIcon
- Highlights when enabled (primaryOutline variant)

**State**: `apps/web/src/client/hooks/use-user-preferences.ts`
- `getMemoryEnabled()` / `setMemoryEnabled()`
- Type: `boolean`, persisted to localStorage

**API**: POST body includes `memoryEnabled: boolean`

### Server Handling

- `packages/server/src/routes/api/chat/handler.ts:46` - receives `memoryEnabled`
- `packages/server/src/routes/api/chat/ai-response.ts:307-332` - wraps model with `withSupermemory()`
- `packages/server/src/lib/supermemory-tools.ts` - memory tools (search + add)

### Mobile Implementation

**Files to modify:**
- `apps/mobile/src/hooks/use-user-preferences.ts` - add `memoryEnabled` state
- `apps/mobile/src/components/chat/chat-input.tsx` - add toggle button
- `apps/mobile/src/components/chat/chat.tsx` - pass to API request

**Steps:**
1. Add `memoryEnabled` to `use-user-preferences.ts` (copy pattern from `searchEnabled`)
2. Add toggle button in `chat-input.tsx` toolbar (use Database icon from lucide)
3. Update `chat.tsx` transport to include `memoryEnabled` in request body

---

## 2. Reasoning Depth

**Second simplest** - dropdown/selector with 3 options.

### Web Implementation

**UI**: `apps/web/src/client/components/chat/chat-input.tsx` (lines 363-415)
- Dropdown menu with Brain icon
- Shows current level as indicator (Quick/Balanced/Deep)
- Cycles: low → medium → high
- Only shown if model supports reasoning (`model.supportsReasoning`)

**State**: `apps/web/src/client/hooks/use-user-preferences.ts`
- `getReasoningEffort()` / `setReasoningEffort()`
- Type: `"high" | "medium" | "low"`, default: `"low"`

**API**: POST body includes `reasoningEffort: "high" | "medium" | "low"`

### Server Handling

- `packages/server/src/routes/api/chat/handler.ts:47` - receives `reasoningEffort`
- `packages/server/src/routes/api/chat/ai-response.ts:302-305` - passed to model

### Mobile Implementation

**Files to modify:**
- `apps/mobile/src/hooks/use-user-preferences.ts` - add `reasoningEffort` state
- `apps/mobile/src/components/chat/chat-input.tsx` - add selector button
- `apps/mobile/src/components/chat/chat.tsx` - pass to API request
- `apps/mobile/src/hooks/use-models.ts` - ensure `supportsReasoning` available

**Steps:**
1. Add `reasoningEffort` to preferences hook
2. Create reasoning selector (could be action sheet or bottom sheet with 3 options)
3. Show Brain icon + level in toolbar, only when model supports reasoning
4. Update transport request body

**Note:** Mobile already displays reasoning parts in messages (`message-parts.tsx` - accordion component). Just need the selector.

---

## 3. AI Rules Selector

**Medium complexity** - requires list UI, search, multi-select.

### Web Implementation

**UI**: `apps/web/src/client/components/chat/rule-selector.tsx`
- Dialog with searchable list
- Shows rule title + truncated content
- Multi-select checkboxes
- Badge shows count of selected rules

**State**: `apps/web/src/client/hooks/use-user-preferences.ts`
- `getSelectedRuleIds()` / `setSelectedRuleIds()`
- Type: `string[]` (array of rule UUIDs)

**API Routes**: `packages/api/src/routers/user-rules.ts`
- `userRules.list()` - fetch all user's rules
- `userRules.create()` / `update()` / `delete()` - CRUD

**DB Schema**: `packages/db/src/schema/user-rules.ts`
- `userRules` table: id, userId, title, content, order, enabled, createdAt, updatedAt

**DB Service**: `packages/db/src/service/user-rules.ts`

### Server Handling

- `packages/server/src/routes/api/chat/handler.ts:49` - receives `selectedRuleIds`
- `packages/server/src/routes/api/chat/handler.ts:9` - fetches rules via `getUserRulesByIds()`
- Rules content injected into system prompt

### Mobile Implementation

**New files to create:**
- `apps/mobile/src/components/chat/rule-selector.tsx` - bottom sheet with rule list
- `apps/mobile/src/hooks/use-rules.ts` - fetch rules via oRPC

**Files to modify:**
- `apps/mobile/src/hooks/use-user-preferences.ts` - add `selectedRuleIds` state
- `apps/mobile/src/components/chat/chat-input.tsx` - add Rules button (opens selector)
- `apps/mobile/src/components/chat/chat.tsx` - pass `selectedRuleIds` to API

**Steps:**
1. Create `use-rules.ts` hook - call `rpcClient.userRules.list()`
2. Add `selectedRuleIds` to preferences
3. Create `rule-selector.tsx`:
   - Bottom sheet modal (use existing patterns from model selector screen)
   - List rules with checkboxes
   - Show title + truncated content
   - Search/filter functionality
4. Add button in chat-input toolbar (FileText or Scroll icon)
5. Update transport request body

**Optional:** Also implement rule management screens (create/edit/delete/reorder) for full feature parity.

---

## 4. MCP Tools Selector

**Most complex** - hierarchical UI (servers → tools), needs server sync.

### Web Implementation

**UI**: `apps/web/src/client/components/chat/tool-selector.tsx`
- Dialog with servers list, expandable to show tools
- Each server shows tool count
- Select individual tools or "all tools" (wildcard)
- Shows tool name + description

**State**: `apps/web/src/client/hooks/use-user-preferences.ts`
- `getSelectedMcpTools()` / `setSelectedMcpTools()`
- Type: `McpToolSelection[]` = `{ mcpServerId: string; toolName: string }[]`

**API Routes**: `packages/api/src/routers/mcp.ts`
```
mcp.servers.list()      - list user's MCP servers
mcp.tools.list()        - get cached tools for server
mcp.tools.sync()        - fetch & cache tools from server
mcp.chat.getSelections() - get selections for chat
mcp.chat.setSelections() - set selections for chat
mcp.chat.addTool()      - add single tool
mcp.chat.removeTool()   - remove tool
```

**DB Schema**: `packages/db/src/schema/mcp.ts`
- `mcpServers` - user's MCP server configs (name, url, type, apiKey)
- `mcpTools` - cached tools from servers
- `chatMcpTools` - per-chat tool selections

**DB Service**: `packages/db/src/service/mcp.ts`

**Server Logic**: `packages/server/src/lib/mcp/`
- `tools.ts` - tool discovery & caching
- `chat.ts` - chat-specific MCP logic
- `client.ts` - MCP client creation

### Server Handling

- `packages/server/src/routes/api/chat/handler.ts:48` - receives `selectedMcpTools`
- `packages/server/src/routes/api/chat/stream.ts` - resolves MCP tools for execution
- Tools injected into AI call, executed when AI requests

### Mobile Implementation

**New files to create:**
- `apps/mobile/src/components/chat/tool-selector.tsx` - bottom sheet with server/tool hierarchy
- `apps/mobile/src/hooks/use-mcp.ts` - fetch servers & tools via oRPC

**Files to modify:**
- `apps/mobile/src/hooks/use-user-preferences.ts` - add `selectedMcpTools` state
- `apps/mobile/src/components/chat/chat-input.tsx` - add Tools button
- `apps/mobile/src/components/chat/chat.tsx` - pass `selectedMcpTools` to API

**Steps:**
1. Create `use-mcp.ts` hook:
   - Fetch servers: `rpcClient.mcp.servers.list()`
   - Fetch tools per server: `rpcClient.mcp.tools.list({ mcpServerId })`
   - Sync tools: `rpcClient.mcp.tools.sync({ mcpServerId })`
2. Add `selectedMcpTools` to preferences (type: `McpToolSelection[]`)
3. Create `tool-selector.tsx`:
   - Bottom sheet modal
   - Collapsible sections per server
   - Checkbox per tool (or "select all" per server)
   - Show tool name + description
   - Sync button to refresh tools from server
4. Add button in chat-input toolbar (Wrench or Puzzle icon)
5. Update transport request body

**Optional:** Also implement MCP server management screens (add/edit/remove servers).

---

## 5. Token/Context Display

**Low priority** - informational only, no behavior change.

### Web Implementation

**UI**: `apps/web/src/client/components/chat/token-usage-indicator.tsx`
- Shows token breakdown (input, output, reasoning, cached)
- Percentage of context window used
- Only renders if usage data exists and model has context limit

**Data Source**: Message metadata contains token counts
- `packages/db/src/schema/messages.ts:26-51` - `MessageMetadata` type

**Model Metadata**: `packages/api/src/routers/models.ts:18`
- Returns `contextLimit`, `inputLimit`, `outputLimit`

### Mobile Implementation

**New files:**
- `apps/mobile/src/components/chat/token-usage-indicator.tsx`

**Approach:**
1. Track token counts from message metadata (already stored)
2. Get model context limit from models hook
3. Display small indicator in toolbar or message footer
4. Could be expandable popover for details

---

## Implementation Order (Recommended)

1. **Memory Toggle** - 1 file change (preferences) + 1 UI button
2. **Reasoning Depth** - 1 file change (preferences) + 1 selector UI
3. **AI Rules** - new hook + new component + preferences
4. **MCP Tools** - new hook + new component + preferences (most complex)
5. **Token Display** - optional polish

---

## Shared Types Reference

```typescript
// From packages/server/src/routes/api/chat/handler.ts
interface ChatRequest {
  message: UIMessage
  model: string
  searchEnabled?: boolean
  memoryEnabled?: boolean
  reasoningEffort?: "high" | "medium" | "low"
  selectedMcpTools?: Array<{ mcpServerId: string; toolName: string }>
  selectedRuleIds?: string[]
  id: string // chatId
  regenerateMessageId?: string
  regenerateRole?: "user" | "assistant"
  editMessageId?: string
  editedText?: string
}

// MCP Tool Selection
type McpToolSelection = {
  mcpServerId: string
  toolName: string
}

// Reasoning effort levels
type ReasoningEffort = "high" | "medium" | "low"
```

---

## Mobile Patterns to Follow

**State persistence**: Use `AsyncStorage` via `use-user-preferences.ts` pattern
**Bottom sheets**: Use existing modal patterns (see model selector screen)
**Icons**: Use `lucide-react-native`
**Haptics**: Call `lightTap()` on button press
**Styling**: NativeWind (Tailwind classes)
**API calls**: Use `rpcClient` from `apps/mobile/src/lib/rpc-client.ts`

---

## Key File Paths Quick Reference

### Web (reference implementation)
```
apps/web/src/client/components/chat/chat-input.tsx      # main input
apps/web/src/client/components/chat/tool-selector.tsx   # MCP tools UI
apps/web/src/client/components/chat/rule-selector.tsx   # AI rules UI
apps/web/src/client/hooks/use-user-preferences.ts       # all preferences
```

### Mobile (files to modify/create)
```
apps/mobile/src/components/chat/chat-input.tsx          # add buttons
apps/mobile/src/components/chat/chat.tsx                # pass to API
apps/mobile/src/hooks/use-user-preferences.ts           # add new states
apps/mobile/src/components/chat/tool-selector.tsx       # NEW
apps/mobile/src/components/chat/rule-selector.tsx       # NEW
apps/mobile/src/hooks/use-mcp.ts                        # NEW
apps/mobile/src/hooks/use-rules.ts                      # NEW
```

### Shared/Server (no changes needed)
```
packages/api/src/routers/mcp.ts                         # MCP procedures
packages/api/src/routers/user-rules.ts                  # rules procedures
packages/server/src/routes/api/chat/handler.ts          # already handles all
packages/db/src/schema/mcp.ts                           # MCP tables
packages/db/src/schema/user-rules.ts                    # rules table
```
