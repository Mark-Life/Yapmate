# LLM Error Handling & User-Facing Error States

## Problem

When LLM generation fails (provider error, insufficient balance, invalid request, rate limit, network issue, etc.), the user sees nothing — a loader appears and then silently disappears. The error is logged server-side but never surfaced to the user. On reload, the failed request is completely lost.

## Goals

1. Persist error state in DB so it survives reload/chat switching
2. Show the user that generation failed with a clear error message
3. Enable retry/regenerate from the error state
4. Optionally auto-retry once for transient errors

---

## Current Flow (What Happens Today)

```
User sends message
  → Server starts streaming
  → LLM provider returns error (e.g. OpenRouter 402, bad request, timeout)
  → handleStreamError() in stream.ts:
      - Saves partial content (if any) via abortStreamAtomic()
      - Clears chat.activeStreamId
      - Updates Redis status to "error"
      - Re-throws error (logged server-side)
  → Frontend onError():
      - Rolls back optimistic message updates
      - Only handles 402 (rate limit) with toast
      - Other errors: console.error + analytics capture
  → User sees: message disappears, nothing else
```

**Key gaps:**
- No error information persisted in DB
- No error UI rendered in chat
- On reload, user message may be saved but assistant error context is lost
- No retry mechanism

---

## Proposed Design

### 1. Database: Add `status` Column to Messages Table

```sql
ALTER TABLE messages ADD COLUMN status text NOT NULL DEFAULT 'completed';
```

**Values:** `"completed"` | `"streaming"` | `"error"`

- `"completed"` — default, all existing messages
- `"streaming"` — set when assistant message is first created (before stream starts)
- `"error"` — set when generation fails

Also add `error` jsonb column to messages:

```typescript
type MessageError = {
  code: string        // machine-readable: "provider_error", "insufficient_balance", "rate_limited", "content_filtered", "timeout", "unknown"
  message: string     // human-readable description
  provider?: string   // e.g. "openrouter", "openai"
  retryable: boolean  // hint for frontend
  raw?: unknown       // raw provider error for debugging (not exposed to users)
}
```

```sql
ALTER TABLE messages ADD COLUMN error jsonb;
```

**Why on messages, not parts?** Error is a property of the generation attempt, not a content part. A message can have partial content (text parts) AND an error status simultaneously. This keeps the parts table focused on content.

**Migration:** Default `status = 'completed'` for all existing rows. No data backfill needed.

### 2. Server: Persist Error State

#### 2.1 In `handleStreamError()` (stream.ts)

When a non-abort error occurs:

```
Current:
  abortStreamAtomic() → saves partial content, clears activeStreamId

Proposed:
  errorStreamAtomic() → saves partial content, sets status='error', saves error details, clears activeStreamId
```

New function in `packages/db/src/service/messages.ts`:

```typescript
/** Save error state for a failed generation */
errorStreamAtomic(chatId, assistantMessageId?, bufferedChunks, errorInfo) {
  // In transaction:
  // 1. If assistant message exists (partial content): update status='error', set error jsonb
  // 2. If no assistant message yet: create one with role='assistant', status='error', error jsonb
  // 3. Clear chat.activeStreamId
  // 4. Update chat.updatedAt
}
```

#### 2.2 Error Classification

Add a helper to classify errors from various providers into the `MessageError` shape:

```typescript
/** Classify provider/SDK errors into structured error info */
classifyGenerationError(error: unknown): MessageError
```

Map common scenarios:
- OpenRouter 402 → `{ code: "insufficient_balance", message: "Provider balance insufficient", retryable: false }`
- OpenRouter 429 → `{ code: "rate_limited", message: "Rate limited by provider", retryable: true }`
- OpenRouter 400 → `{ code: "bad_request", message: "Invalid request to model", retryable: false }`
- Network/timeout → `{ code: "timeout", message: "Request timed out", retryable: true }`
- Content filter → `{ code: "content_filtered", message: "Content was filtered", retryable: false }`
- Unknown → `{ code: "unknown", message: error.message || "Generation failed", retryable: true }`

#### 2.3 Stream Error Chunk

Before the stream ends on error, emit a custom data chunk so the frontend gets the error info in real-time (without needing to reload):

```typescript
// In handleStreamError, before closing stream:
writer.write(formatDataStreamPart("data", {
  type: "data-generation-error",
  data: { messageId, error: classifiedError }
}));
```

This ensures the frontend gets the error even if the SSE connection is still open.

### 3. Frontend: Render Error State

#### 3.1 Error Message Component

New component: `MessageError` (or extend existing message bubble)

When a message has `status === 'error'`:
- Show partial content if any (text that was generated before failure)
- Show error banner below the message content:
  - Icon + human-readable error message
  - "Retry" button (calls regenerate with same params)
  - If `retryable: false`, show appropriate guidance (e.g. "Check provider balance")

```
┌─────────────────────────────────┐
│ [partial AI response if any...] │
│                                 │
│ ⚠ Generation failed             │
│ Provider balance insufficient   │
│                                 │
│ [Retry]  [Delete]               │
└─────────────────────────────────┘
```

#### 3.2 Update `onError` Handler (chat.tsx)

Current behavior: rolls back optimistic updates, removing the user message.

New behavior:
- Do NOT roll back the user message (it was already saved to DB)
- If we receive `data-generation-error` chunk: render the error message in-place
- If no chunk received (connection dropped): on next load, the errored message loads from DB with `status='error'`

#### 3.3 Update `onData` Handler

Handle new `data-generation-error` data part:

```typescript
if (dataPart.type === "data-generation-error") {
  const { messageId, error } = dataPart.data;
  // Update the message in local state to show error UI
  // No toast — render inline in the chat
}
```

#### 3.4 Message Loading from DB

When loading messages via `getMessages()`, include `status` and `error` fields. The mapping function (`mapDbMessageToUI`) should pass these through in message metadata or as a custom property so the frontend can render error state.

#### 3.5 Retry Flow

"Retry" button on an errored message triggers regeneration:
1. Delete the errored assistant message (or update its status back to 'streaming')
2. Re-send the generation request with same model/params
3. Same flow as existing regenerate

Can reuse existing `handleRegenerate()` logic — it already handles replacing the last assistant message.

### 4. Usage: Errored Generations Don't Count

Errored generations must NOT count toward the user's generation limit. When a generation fails:
- Do not increment the usage counter
- If usage was already incremented optimistically, decrement it on error
- This applies to all error types (retryable and non-retryable)

### 5. Multi-User: Errors Visible to All Members

Error state is visible to all chat members, not just the sender. The `data-generation-error` chunk is already broadcast via WebSocket to all connected members. On reload, the errored message loads from DB for everyone.

### 6. Optional: Auto-Retry for Transient Errors

For errors classified as `retryable: true`, the server can automatically retry once before persisting the error:

```
Generation fails
  → classifyError()
  → if retryable && retryCount === 0:
      wait 1-2s
      retry with same params
  → if retry also fails OR not retryable:
      persist error state
      emit error chunk
```

**Scope this to phase 2** — keep initial implementation simple with manual retry only.

---

## Implementation Order

### Phase 1: Core Error Persistence & Display
1. [x] Add `status` and `error` columns to messages schema (Drizzle schema only — **no migration run**)
2. [x] Add `classifyGenerationError()` helper (with `raw` field for debugging)
3. [x] Add `errorStreamAtomic()` DB service function
4. [x] Update `handleStreamError()` to use `errorStreamAtomic()` + emit error chunk
5. [x] Ensure errored generations don't count toward usage limit
6. [x] Update message mapping to include status/error (strip `raw` from client response)
7. [x] Frontend: handle `data-generation-error` in `onData`
8. [x] Frontend: render error state in message bubble (visible to all chat members)
9. [x] Frontend: retry button wired to regenerate

> **Migration note:** Schema changes (step 1) will be committed as Drizzle schema code only.
> `bun run db:generate` and `bun run db:migrate` will be run manually by a human after reviewing the PR.
> Build/typecheck may fail due to schema-DB desync until migration is applied — this is expected.

### Phase 2: Polish & Auto-Retry
10. Auto-retry once for transient errors (server-side)
11. "Delete" button on errored messages (remove failed attempt)
12. Error analytics (track error rates by provider/model)

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/db/src/schema/messages.ts` | Add `status` and `error` columns, `MessageError` type |
| `packages/db/src/service/messages.ts` | Add `errorStreamAtomic()`, update mapping |
| `packages/server/src/routes/api/chat/stream.ts` | Update `handleStreamError()` to persist + emit error |
| `packages/server/src/routes/api/chat/handler.ts` | Minor: pass error info through |
| `packages/server/src/lib/error-classifier.ts` | New: `classifyGenerationError()` |
| `apps/web/src/client/components/chat/chat.tsx` | Update `onError`, `onData` handlers |
| `apps/web/src/client/components/chat/message-error.tsx` | New: error state UI component |
| `apps/web/src/client/components/chat/message.tsx` | Render error state when present |
| DB migration | **Human-run only** — `bun run db:generate` + `bun run db:migrate` after PR review |

---

## Resolved Decisions

1. **Errored generations do NOT count toward usage limit.** Applies to all error types.
2. **Raw provider error stored in `MessageError.raw`** for debugging. Stripped before sending to client.
3. **Errors visible to all chat members** via WebSocket broadcast + DB persistence.
4. **User message kept on error.** Error shown on the assistant message placeholder, not rolled back.
5. **DB migration run manually by human** after reviewing PR. Build may fail until migration applied — expected.

## Open Questions

1. Should we add a dedicated admin/debug view to inspect `raw` errors, or just rely on DB queries?
