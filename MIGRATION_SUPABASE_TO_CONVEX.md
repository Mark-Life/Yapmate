# Supabase to Convex Migration Plan

## Current Supabase Usage (Full Audit)

| Feature | Usage | Files |
|---------|-------|-------|
| **Auth** | JWT sessions, magic link, email/password, OTP, Bearer tokens (mobile) | `packages/server/src/lib/supabase/index.ts`, `apps/web/src/client/lib/auth.ts`, `apps/web/src/client/lib/supabase/client.ts`, `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/contexts/auth.tsx` |
| **Database** | PostgreSQL via Drizzle ORM, 13 tables | `packages/db/src/schema/*.ts`, `packages/db/src/service/*.ts`, `packages/db/src/client.ts` |
| **File Storage** | `user-files` bucket, signed URLs, RLS policies | `packages/server/src/lib/supabase/files.ts`, `packages/db/src/service/files.ts` |
| **Vault** | Encrypted MCP API key storage | `packages/db/src/service/vault.ts` |
| **Realtime** | NOT used (custom WebSocket + Redis) | n/a |

> **Note**: Auth, Storage, and Vault are also integrated. After analysis: **keep Supabase Auth + Storage**, only migrate the data layer (PostgreSQL → Convex). This dramatically reduces risk and scope.

---

## Convex Equivalents (Hybrid Approach)

| Supabase | Migration Target |
|----------|-----------------|
| PostgreSQL + Drizzle | **→ Convex Document DB** + schema |
| Supabase Auth | **→ STAYS in Supabase** (Convex verifies JWTs via JWKS) |
| Supabase Storage | **→ STAYS in Supabase** (cheaper, CDN, already works) |
| Supabase Vault | **→ Convex env vars** + encrypted doc fields |
| RLS policies | **→ Convex function-level auth** (already doing this in services) |
| SQL migrations | **→ Convex schema auto-migration** |

---

## Key Architecture Changes

### What changes
- **No more SQL/Drizzle** — Convex document DB with TypeScript query/mutation functions
- **No more `DATABASE_URL`** — Convex manages its own infra
- **Reactive by default** — Convex queries are live (could eventually replace Redis pub/sub for data sync)
- **Server functions** — queries/mutations/actions run on Convex cloud, not your Bun server
- **Vault goes away** — replaced by encrypted doc fields + env vars

### What stays the same
- **Supabase Auth** — unchanged, Convex just verifies JWTs
- **Supabase File Storage** — unchanged, files stay in S3
- **WebSocket + Redis** — typing indicators, presence
- **Bun server** — SSE streaming (AI SDK), oRPC routes, HTTP routes
- **oRPC** — calls Convex via `ConvexHttpClient` server-side
- **All client auth code** — login, signup, magic link, OTP unchanged

---

## Schema Translation

### Tables → Convex Documents

```
users           → users (keep Supabase auth UUID as `supabaseId` field, indexed)
chats           → chats
messages        → messages
parts           → parts (or embed in messages as nested array — see decision below)
chat_members    → chatMembers
files           → files (metadata only; storagePath still points to Supabase Storage)
user_rules      → userRules
mcp_servers     → mcpServers (add encrypted apiKey field, replaces vault)
mcp_tools       → mcpTools
chat_mcp_tools  → chatMcpTools
usage_records   → usageRecords
feedback        → feedback
migrationStatus → migrationStatus (NEW — tracks per-user migration state)
```

**ID strategy**: Supabase UUIDs stored as string fields (e.g., `supabaseId` on users). Convex generates its own `_id` for each doc. All foreign keys use Convex `_id` internally, but original UUIDs stored for cross-reference during migration and for Supabase Auth/Storage integration.

**Decision needed**: `parts` — keep normalized (separate table) or embed inside `messages` as array? Embedding simplifies reads but: 1MB doc limit + 8192 array limit. Tool-heavy messages with large results could hit limits. Safer: keep separate.

**Stripe tables**: No longer sync'd via Supabase Stripe extension. Use Stripe webhooks → Convex HTTP action to write subscription data.

---

## Hybrid Architecture Analysis

Before choosing a migration strategy, decide what stays in Supabase vs what moves to Convex.

### Keep Supabase Auth + Convex Data (RECOMMENDED)

**Verdict: Yes, this works well. Best path for gradual migration.**

Convex supports custom JWT providers. Supabase Auth issues JWTs with asymmetric signing (ES256). Convex verifies them via JWKS endpoint — zero shared secrets.

**How it works**:
```
Client → Supabase Auth (login, signup, magic link, OTP)
Client → gets JWT from Supabase
Client → passes JWT to Convex
Convex → verifies JWT via Supabase JWKS endpoint
Convex → extracts `sub` claim = Supabase user UUID
```

**Config** (`convex/auth.config.ts`):
```typescript
export default {
  providers: [{
    type: "customJwt",
    issuer: "https://YOUR_PROJECT.supabase.co/auth/v1",
    jwks: "https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json",
    algorithm: "ES256",
    applicationID: "authenticated",
  }],
};
```

**Why this is the best approach**:
- Zero auth migration needed — users keep their passwords, sessions, everything
- Supabase Auth UUIDs stay as user IDs in Convex (no ID remapping)
- All client auth code (`apps/web/src/client/lib/auth.ts`, mobile auth) stays unchanged
- Server auth middleware (`packages/server/src/lib/supabase/index.ts`) stays unchanged
- Only need thin adapter: `ConvexProviderWithAuth` wrapping Convex client, passing Supabase JWT
- Supabase Auth is free tier generous (50k MAU) — no reason to leave it

**What changes**:
- Add `convex/auth.config.ts` with custom JWT provider
- Wrap Convex client with auth in `apps/web` and `apps/mobile`
- Convex functions use `ctx.auth.getUserIdentity()` → gets Supabase UUID from `sub` claim

**Files untouched**: `apps/web/src/client/lib/auth.ts`, `apps/web/src/client/lib/supabase/client.ts`, `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/contexts/auth.tsx`

### Keep Supabase Storage + Convex Data (RECOMMENDED)

**Verdict: Yes, keep it. Convex file storage is weaker for this use case.**

| | Supabase Storage | Convex File Storage |
|---|---|---|
| Backing | S3 | Convex-managed |
| Max file size | 5GB (configurable) | No hard limit, but 20MB via HTTP action |
| Current app limit | 10MB | Would need upload URL workaround for >20MB |
| Signed URLs | Yes, configurable expiry | Yes, 15min default |
| CDN | Supabase CDN included | No built-in CDN (need ConvexFS/Bunny addon) |
| RLS policies | Native | N/A (function-level) |
| Cost | $0.021/GB/mo | $0.03/GB/mo |
| Direct browser upload | Yes | Yes (via upload URL) |

**Why keep Supabase Storage**:
- Already works, RLS policies in place
- Cheaper per GB
- Built-in CDN
- No file migration needed (biggest time saver — files are the bottleneck in any migration)
- Your current file flow (dataUrl → background upload → signed URL) stays untouched

**What changes**: Nothing in `packages/server/src/lib/supabase/files.ts`. The `files` table metadata moves to Convex, but `storagePath` still points to Supabase Storage. `getFileAccessUrl` still calls Supabase for signed URLs.

**Files untouched**: `packages/server/src/lib/supabase/files.ts`, `packages/server/src/lib/supabase/admin-client.ts`

### Vault → Convex Environment Variables + Encrypted Fields

Supabase Vault is a PostgreSQL extension — it goes away when DB moves. Options:
- **Static secrets** (API keys, service keys): Convex environment variables
- **Per-user MCP API keys**: Encrypt with `node:crypto` in a Convex action, store ciphertext in `mcpServers` doc. Encryption key in Convex env var.

---

## Revised Architecture (Hybrid)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Supabase   │    │   Convex     │    │   Bun Server     │
│             │    │              │    │                  │
│  Auth ──────┼─JWT─▶ Data Layer  │    │  AI Streaming    │
│  Storage    │    │  (all tables)│◄───│  oRPC routes     │
│             │    │              │    │  WebSocket+Redis │
└─────────────┘    └──────────────┘    └──────────────────┘
```

**Supabase keeps**: Auth (JWT issuer), File Storage (S3 bucket)
**Convex gets**: All 13 tables, realtime data queries
**Bun server keeps**: SSE streaming, oRPC, WebSocket, HTTP routes

---

## Data Migration Strategy Comparison

### Option A: Big-Bang Script Migration

```
1. Maintenance mode ON
2. Script reads all Supabase tables → writes to Convex (batched)
3. Verify counts
4. Switch env
5. Maintenance mode OFF
```

| Pros | Cons |
|------|------|
| Simple, one-shot | 10-30min downtime |
| Easy to verify (count comparison) | All-or-nothing: if it fails, rollback |
| Clean cutover point | Must migrate ALL data even if users are inactive |
| No dual-write complexity | Stale data for users who never return |

**Best for**: Small user base, low tolerance for complexity.

### Option B: Lazy Migration (On User Open App)

User opens app → check if migrated → if not, migrate their data on the fly.

```
Flow:
1. User logs in (Supabase Auth, unchanged)
2. App calls Convex: `getUserMigrationStatus(supabaseUserId)`
3. If not migrated:
   a. Show loading/migration screen
   b. Call Convex action: `migrateUser(supabaseUserId)`
   c. Action reads user's data from Supabase PG (via direct PG connection or API)
   d. Writes to Convex: user → chats → messages → parts → files metadata → rules → mcp → usage
   e. Mark user as migrated in Convex
4. Continue to app (now reads from Convex)
```

**Implementation**:
- `convex/migration.ts` — migration action + status query
- `migrationStatus` table in Convex: `{ supabaseUserId, status, migratedAt, error? }`
- Client-side: migration gate component wrapping app

| Pros | Cons |
|------|------|
| Zero downtime | Dual-read complexity: unmigrated users read Supabase, migrated read Convex |
| Only migrate active users | Need to keep Supabase PG running until all active users migrated |
| Gradual rollout, catch bugs early | Migration failures block individual users |
| Natural load distribution | Race conditions: user sends message during migration |
| Users who never return = never migrated (save effort) | Need migration gate UI (loading screen) |

**Mitigations**:
- Lock user's data during migration (show "Updating your account..." screen, ~5-30s per user)
- Retry on failure with exponential backoff
- Admin dashboard to monitor migration progress
- Timeout: after N weeks, force-migrate remaining users via script (Option A for stragglers)

### Option C: Manual Trigger (Admin Migrates Specific User)

You trigger migration for specific users from admin panel or CLI.

```
Flow:
1. Admin panel: list users with migration status
2. Click "Migrate" on a user (or batch select)
3. Calls Convex action: `migrateUser(supabaseUserId)`
4. Same migration logic as Option B
5. User doesn't notice — next time they open app, data is in Convex
```

**Implementation**:
- Same `convex/migration.ts` as Option B
- Admin oRPC route or Convex HTTP action: `POST /admin/migrate-user`
- Admin UI in existing debug page (`apps/web` admin page)
- CLI script: `bun scripts/migrate-user.ts <userId>` for bulk/manual

| Pros | Cons |
|------|------|
| Full control over who/when | Manual effort per user |
| Can prioritize paying users first | Users may hit unmigrated state if you're slow |
| Test with your own account first | Need admin tooling |
| No user-facing migration UI needed | Still need dual-read until fully migrated |

### RECOMMENDED: Option B + C Combined

Best of both worlds:

1. **Phase 1**: Manual trigger (Option C) — migrate yourself + team + beta testers
2. **Phase 2**: Enable lazy migration (Option B) — new logins auto-migrate
3. **Phase 3**: Script sweep (Option A) — force-migrate remaining inactive users after 4-6 weeks
4. **Shutdown**: Turn off Supabase PG

**Dual-read routing logic** in service layer:

```typescript
// packages/db/src/service/chats.ts (simplified)
const getChat = async (chatId: string, userId: string) => {
  const migrated = await isMigrated(userId)
  if (migrated) return convexClient.query("chats:get", { chatId })
  return drizzleGetChat(chatId) // existing code
}
```

Or cleaner: middleware-level routing. Check migration status once per request, inject correct client.

---

## Migration Strategy (Revised 4 Phases)

### Phase 1: Setup + Schema (Week 1)

**Goal**: Convex project running alongside Supabase. No traffic yet.

1. `npx convex init` in monorepo root
2. Define Convex schema (`convex/schema.ts`) matching all 13 tables + `migrationStatus` table
3. Configure Convex custom JWT auth pointing to Supabase Auth JWKS
4. Write all query/mutation functions mirroring `packages/db/src/service/*.ts`:
   - `convex/chats.ts` — mirrors `packages/db/src/service/chats.ts`
   - `convex/messages.ts` — mirrors `packages/db/src/service/messages.ts`
   - `convex/users.ts` — mirrors `packages/db/src/service/users.ts`
   - `convex/files.ts` — mirrors `packages/db/src/service/files.ts` (metadata only; storage stays Supabase)
   - `convex/chatMembers.ts` — mirrors `packages/db/src/service/chat-members.ts`
   - `convex/mcp.ts` — mirrors `packages/db/src/service/mcp.ts`
   - `convex/userRules.ts` — mirrors `packages/db/src/service/user-rules.ts`
   - `convex/usage.ts` — mirrors `packages/db/src/service/usage.ts`
   - `convex/feedback.ts` — mirrors `packages/db/src/service/feedback.ts`
   - `convex/rateLimit.ts` — mirrors `packages/db/src/service/rate-limit.ts`
5. Write migration action: `convex/migration.ts` — reads Supabase PG, writes Convex
6. Replace vault: encrypt MCP keys with `node:crypto`, store ciphertext in mcpServers doc

**Files to create**:
- `convex/schema.ts`
- `convex/auth.config.ts` (custom JWT → Supabase JWKS)
- `convex/*.ts` (one per service domain)
- `convex/migration.ts` (user migration action)
- `convex/http.ts` (Stripe webhooks, admin migration endpoint)

### Phase 2: Dual-Read Adapter + Integration (Week 2)

**Goal**: Service layer routes to Drizzle or Convex based on user migration status.

1. Add `ConvexHttpClient` to server for server-side Convex calls
2. Add migration status check to request middleware (`packages/api/src/middleware.ts`)
   - On each authenticated request: check if user is migrated (cache in memory/Redis, TTL 5min)
   - Inject `{ isMigrated: boolean, convexClient?, drizzleClient? }` into context
3. Update `packages/db/src/service/*.ts` — each function checks migration flag:
   - Migrated → call Convex query/mutation
   - Not migrated → existing Drizzle code (unchanged)
4. Add Convex React provider alongside Supabase in web app
   - `ConvexProviderWithAuth` using Supabase JWT
   - Convex client available in React tree
5. Add admin migration controls to debug page
6. Keep file storage calls pointing to Supabase (unchanged)

**Files to modify**:
- `packages/db/src/service/*.ts` (add dual-read routing)
- `packages/api/src/middleware.ts` (add migration status to context)
- `apps/web/src/client/` — add Convex provider
- `apps/web/src/server/index.ts` — init ConvexHttpClient
- Admin debug page — add migration controls

**Files untouched** (key benefit of hybrid):
- `packages/server/src/lib/supabase/index.ts` (auth stays)
- `packages/server/src/lib/supabase/files.ts` (storage stays)
- `apps/web/src/client/lib/auth.ts` (auth stays)
- `apps/mobile/src/contexts/auth.tsx` (auth stays)

### Phase 3: Gradual Data Migration (Week 3-4)

**Goal**: Migrate all users to Convex data layer.

#### Step 1: Manual migration (you + team)
- Use admin debug page or CLI: `bun scripts/migrate-user.ts <userId>`
- Test thoroughly with real data
- Fix any bugs found

#### Step 2: Enable lazy migration
- Deploy migration gate component
- Users who open app get migrated on the fly (~5-30s per user)
- Monitor via admin dashboard: migrated count, errors, avg time

#### Step 3: Sweep remaining users (after 4-6 weeks)
- Run bulk script for users who never logged in
- Or decide: don't migrate inactive users, let their data age out

#### Migration Action Logic (`convex/migration.ts`)

```typescript
// Convex action (can make external HTTP calls)
export const migrateUser = action({
  args: { supabaseUserId: v.string() },
  handler: async (ctx, { supabaseUserId }) => {
    // 1. Check if already migrated
    // 2. Connect to Supabase PG (read-only)
    // 3. Read user's data in dependency order:
    //    user → chats → messages → parts → files(metadata) → rules → mcp → usage → feedback
    // 4. Write to Convex in batches (mutations)
    // 5. Mark migrated
  }
})
```

**File migration**: NOT needed. Files stay in Supabase Storage. Only file metadata (the `files` table rows) moves to Convex. `storagePath` values stay the same, signed URL generation still calls Supabase.

#### Per-User Migration Size Estimate
- Average user: ~50 chats, ~500 messages, ~2000 parts, ~5 files
- Estimated per-user migration: 2-10 seconds
- Heavy user (thousands of messages): 15-30 seconds
- Total 0.5GB across all users: only DB rows move, not files

### Phase 4: Cleanup (Week 5-6)

**Only after all active users migrated.**

1. Remove dual-read logic from `packages/db/src/service/*.ts`
2. Remove Drizzle dependencies: `drizzle-orm`, `drizzle-kit`, `postgres`
3. Remove `packages/db/src/client.ts` (Drizzle PG client)
4. Remove `packages/db/src/migrations/`
5. Remove `packages/db/drizzle.config.ts`
6. Remove `packages/db/src/schema/*.ts` (Drizzle schemas, replaced by `convex/schema.ts`)
7. Drop `DATABASE_URL` env var
8. Keep: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (still needed for auth + storage)
9. Downgrade Supabase plan (no longer need DB, just Auth + Storage — may fit free tier)
10. Remove migration gate UI + migration status table after all users done

---

## Testing Strategy

### Unit Tests
- Test every Convex query/mutation function in isolation
- Use Convex test helpers (`convex-test` package)
- Mirror existing service function behavior: same inputs → same outputs

### Integration Tests
- Auth flow: signup → login → token verification → protected routes
- File upload → storage → signed URL → download
- Chat flow: create → send message → stream response → save
- Multi-user: invite → join → presence → message visibility
- MCP: add server → store secret → sync tools → use in chat

### Data Integrity Tests (Post-migration)
- Row count comparison per table
- Spot-check random records (fetch by old ID, compare fields)
- File integrity: download from Convex, compare checksums to Supabase originals
- Auth: verify users can log in
- Usage records: verify cost totals match

### E2E Tests
- Full chat flow on web + mobile
- File upload/download
- Stripe subscription check
- Rate limiting

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ~~User password loss~~ | **Eliminated** — keeping Supabase Auth, no password migration needed |
| ~~File migration bottleneck~~ | **Eliminated** — keeping Supabase Storage, no file transfer needed |
| Data loss during migration | Supabase PG stays read-only during transition; Convex is additive. Rollback = flip migration flag back |
| Dual-read bugs | Extensive testing in Phase 2. Migration flag is per-user — rollback one user without affecting others |
| Convex query performance | Define indexes in `convex/schema.ts` upfront. Benchmark: `getMessagesByChatId` (hottest query), `getChatsByUser` |
| Convex limits | 1MB/doc (parts with large tool results), 8192 array elements, 1s mutation timeout, 10min action timeout. Profile worst-case messages early |
| Race condition during lazy migration | Lock user (show migration screen) during migration. No writes to Supabase PG for that user during transfer |
| Stale migration cache | Migration status cached 5min in Redis. After migration completes, invalidate cache immediately |
| Convex action timeout | Per-user migration should be 2-30s. For users with 10k+ messages, batch into multiple action calls with cursor |
| Partial migration failure | Each table migrated in order. On failure: mark user as `migration_failed`, log error, allow retry. Don't mark as migrated until all tables done |
| Cost | Convex pro $25/mo. Supabase free tier covers Auth + Storage after DB removed. Net cost change: estimate Convex function calls vs current PG |

---

## Dependency Changes

```diff
# Remove (after Phase 4 cleanup)
- drizzle-orm
- drizzle-kit
- postgres

# Keep (Supabase Auth + Storage)
  @supabase/supabase-js
  @supabase/ssr

# Add
+ convex
```

> Note: `@convex-dev/auth` NOT needed — using Supabase Auth as custom JWT provider instead.

---

## Optional: Leverage Convex Reactivity (Post-Migration)

Not required but high value:

- **Replace Redis pub/sub for data sync**: Convex queries are live. `useQuery` for chat messages auto-updates when new messages are saved. Could eliminate `message_saved`, `chat_updated`, `chat_deleted` WebSocket events.
- **Keep WebSocket for**: typing indicators, presence (ephemeral, not DB-backed)
- **Replace oRPC partially**: Convex client can call mutations directly from React, no need for oRPC middleware layer for simple CRUD. Keep oRPC for complex server-only logic (AI streaming, Stripe).
- **Simplify file service**: If Convex reactivity handles message updates, file URL resolution could move to a Convex query that calls Supabase Storage for signed URLs (via action).

---

## Convex Limits Reference

| Limit | Value | Impact |
|-------|-------|--------|
| Document size | 1 MiB | Parts with large tool call results could hit this |
| Array elements per doc | 8,192 | Don't embed all parts in message doc if many tool calls |
| Mutation timeout | 1 second | Keep mutations small, batch large writes |
| Action timeout | 10 minutes | Per-user migration fits easily |
| Transaction docs scanned | 32,000 | Paginate large chat histories |
| Transaction docs written | 16,000 | Batch migration writes |
| Concurrent mutations | 256 | Fine for normal load; rate-limit bulk migration |
| DB storage (pro) | 50GB included | 0.5GB current data = plenty of room |
| File via HTTP action | 20MB upload/response | Current app limit is 10MB, fits fine |

---

## Unresolved Questions

1. **Parts normalization**: Keep `parts` as separate Convex table or embed in `messages` doc? Embedding simpler but 8192 array limit + 1MB doc limit. Separate table is safer for tool-heavy messages.
2. **oRPC future**: Keep oRPC calling Convex via `ConvexHttpClient`, or gradually expose Convex queries/mutations directly to frontend via `useQuery`/`useMutation`?
3. **Vault replacement**: Encrypt per-user MCP keys with `node:crypto` AES-256 in Convex action, store ciphertext in doc field. Master key in Convex env var. Confirm this approach.
4. **Stripe sync**: Supabase Stripe extension goes away with DB. Options: (a) Stripe webhooks → Convex HTTP action, (b) query Stripe API directly on each rate-limit check (slower, but simpler).
5. **Mobile Convex client**: Verify `convex` package works with Expo React Native. Convex docs say React Native supported — test with current Expo version.
6. **Cost estimation**: Convex pro = $25/dev/mo + usage. Current Supabase plan cost? Downgrade Supabase to free tier (Auth + Storage only) saves money.
7. **Inactive user cutoff**: After how many weeks of lazy migration do we script-sweep remaining users? 4 weeks? 8 weeks? Or never migrate inactive users?
