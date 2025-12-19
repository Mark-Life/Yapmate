# Initial data layer

## Current State

Your codebase is well-prepared for persistence:
- Already generates chat IDs (UUID v7)
- Already has `result.consumeStream()` for handling disconnects
- TODO comments mark exact spots for persistence
- Server-side message ID generation already set up

---

## Analysis: Your Requirements

| Feature | Complexity | Dependencies |
|---------|------------|--------------|
| **Basic persistence** (save/load chats) | Low | PostgreSQL + Drizzle |
| **Optimized transport** (send only last message) | Low | None (AI SDK built-in) |
| **Stream resumption on reload** | Medium | Redis + `resumable-stream` |
| **Multi-device real-time sync** | High | Redis pub/sub |
| **Continue after all clients disconnect** | Already done ✓ | `consumeStream()` |

---

## Options

### Option A: Simple Persistence First (Recommended Start)
**Stack**: PostgreSQL + Drizzle ORM

1. Store chats/messages in Postgres
2. Send only last message to server (optimize bandwidth)
3. Load previous messages from DB on server

**Pros**:
- Works today, can add resumability later
- Matt Pocock's normalized schema is solid for tool calls/reasoning parts
- No Redis dependency initially

**Cons**:
- No stream resumption across devices/reloads yet

---

### Option B: Full Resumability (Your Ideal UX)
**Stack**: PostgreSQL + Drizzle + Redis + `resumable-stream`

Everything from Option A, plus:
1. Store active `streamId` in DB
2. Use Redis to buffer SSE stream
3. Multiple clients can connect to same stream
4. GET endpoint to resume streams

**Pros**:
- Complete UX you described
- Multiple devices see same stream in real-time

**Cons**:
- More infrastructure (Redis)
- More complex initial setup
- `resume` is incompatible with abort functionality

---

## My Recommendation: Phased Approach

### Phase 1: Simple Persistence (do first)
```
PostgreSQL + Drizzle ORM
├── chats table (id, title, createdAt, updatedAt)
├── messages table (id, chatId, role, createdAt)
└── parts table (id, messageId, type, order, + type-specific columns)
```

Changes needed:
- Add Drizzle + PostgreSQL driver
- Create schema (following Matt Pocock's normalized approach for parts)
- Update `chat-store.ts` with `createChat`, `loadChat`, `saveChat`
- Update route.ts to load previous messages + save on finish
- Update chat.tsx to use `prepareSendMessagesRequest`

### Phase 2: Stream Resumability (add later)
- Add Redis (Vercel KV, Upstash, or self-hosted)
- Add `resumable-stream` package
- Create GET endpoint at `/api/chat/[id]/stream`
- Add `consumeSseStream` callback to POST handler
- Enable `resume: true` in useChat

---

## Schema Decision: JSON blob vs Normalized Parts

**Matt Pocock's normalized approach** is better for your case because:

1. **You have reasoning parts** – can query/filter them separately
2. **Future tools** – each tool gets typed columns with constraints
3. **Migrations** – changing part structure is safer
4. **Querying** – "show me all messages with reasoning" becomes SQL query

**Simpler JSON blob** approach is fine if:
- You only have text parts
- You don't need to query by part type
- You want faster initial setup

Given you already display reasoning parts, I'd go with **normalized**.

---

## Questions for You

1. **Do you have PostgreSQL set up?** (Vercel Postgres, Supabase, Neon, local?)
2. **Do you need multi-device sync in v1?** Or is reload resumption enough?
3. **Auth** – are you planning to add it? (affects schema – userId on chats table)
4. **Parts** – besides `text` and `reasoning`, do you have other custom parts or tools?

---

## If You Want to Start Now

I can create the Phase 1 implementation:

1. Add drizzle-orm + postgres driver to dependencies
2. Create `src/db/` with schema and client
3. Update `chat-store.ts` with actual DB operations
4. Wire up route.ts and chat.tsx


---

# Phase 1 Completion Checklist

### ✅ Done
- [x] Schema files (`users`, `chats`, `messages`, `parts`, `files`)
- [x] `timestamps` helper
- [x] Schema re-exports

### 🔧 Infrastructure
| Task | Description |
|------|-------------|
| 1. **Update `client.ts`** | Switch from `@vercel/postgres` to `postgres-js` for Supabase |
| 2. **Add `postgres` package** | `bun add postgres` |
| 3. **Update `drizzle.config.ts`** | Ensure path is correct for Supabase |
| 4. **Create Supabase project** | Get connection string, set `DATABASE_URL` |
| 5. **Run migration** | `bun run db:generate` + `bun run db:migrate` |

### 📦 Service Layer (`src/db/service/`)
| File | Functions |
|------|-----------|
| `chats.ts` | `createChat`, `getChat`, `getChatsByUser`, `updateChatTitle`, `deleteChat`, `branchChat` |
| `messages.ts` | `getMessagesByChatId`, `saveMessages`, `deleteMessagesFromOrder` (for regenerate) |
| `mapping.ts` | `mapUIMessageToDb`, `mapDbMessageToUI`, `mapUIPartToDb`, `mapDbPartToUI` |

### 🔄 Integration
| Task | File | Description |
|------|------|-------------|
| 6. **Update `chat-store.ts`** | `src/lib/chat-store.ts` | Use service layer functions |
| 7. **Update API route** | `src/app/api/chat/route.ts` | Load previous messages, save on finish |
| 8. **Update chat component** | `src/components/chat.tsx` | Use `prepareSendMessagesRequest` to send only last message |
| 9. **Create chat page** | `src/app/chat/[id]/page.tsx` | Load chat from DB, pass to component |

### 📁 File Storage (can defer)
| Task | Description |
|------|-------------|
| 10. **Create Supabase Storage bucket** | Private bucket for user files |
| 11. **File service** | `src/db/service/files.ts` - upload, getSignedUrl, delete |
| 12. **File upload API** | `/api/files/upload` endpoint |

---

## Order of Implementation

```
1. Infrastructure (client, package, config)
         ↓
2. Run first migration (create tables)
         ↓
3. Mapping functions (UI ↔ DB conversion)
         ↓
4. Service layer (chats.ts, messages.ts)
         ↓
5. Update chat-store.ts
         ↓
6. Update API route + chat component
         ↓
7. Test with real DB
         ↓
8. File storage (can do later)
```

---

## Key Functions to Implement

### `src/db/service/mapping.ts`
```typescript
// UI → DB (when saving)
mapUIMessageToDb(uiMessage: UIMessage, chatId: string, order: number) → { message: MessageInsert, parts: PartInsert[] }

// DB → UI (when loading)
mapDbMessageToUI(dbMessage: MessageSelect, dbParts: PartSelect[]) → UIMessage
```

### `src/db/service/messages.ts`
```typescript
// Save all messages (upsert - handles new + updated)
saveMessages(chatId: string, uiMessages: UIMessage[]) → Promise<void>

// Load messages with parts, return as UIMessage[]
getMessagesByChatId(chatId: string) → Promise<UIMessage[]>

// For regenerate: delete messages from order N onwards
deleteMessagesFromOrder(chatId: string, fromOrder: number) → Promise<void>
```

### `src/db/service/chats.ts`
```typescript
createChat(userId: string, title?: string) → Promise<string>
getChat(chatId: string) → Promise<ChatSelect | null>
getChatsByUser(userId: string) → Promise<ChatSelect[]>
updateChatTitle(chatId: string, title: string) → Promise<void>
deleteChat(chatId: string) → Promise<void>
branchChat(originalChatId: string, fromMessageOrder: number) → Promise<string>
```

---
