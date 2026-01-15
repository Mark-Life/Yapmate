# Migration Plan: Supabase + Redis → Convex

## Overview

Migrate yapmate from Supabase (PostgreSQL + Auth) and Redis (Upstash) to Convex for:
- Built-in real-time reactivity (eliminates Redis Pub/Sub + custom WebSocket server)
- Unified backend (database + auth + serverless functions)
- Simpler architecture with fewer moving parts

## Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  React Web  │     │   Mobile    │     │   oRPC API  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌────────────┴────────────┐
              │      Bun Server         │
              │  ┌──────────────────┐   │
              │  │  WebSocket /ws   │   │
              │  └────────┬─────────┘   │
              └───────────┼─────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
│  Supabase   │    │    Redis    │    │  Supabase   │
│  PostgreSQL │    │   Upstash   │    │    Auth     │
│  (Drizzle)  │    │  Pub/Sub +  │    │ Magic Link  │
│             │    │   Buffers   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Target Architecture

```
┌─────────────┐     ┌─────────────┐
│  React Web  │     │   Mobile    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
        ┌────────┴────────┐
        │     Convex      │
        │  ┌───────────┐  │
        │  │ Database  │  │
        │  │ (reactive)│  │
        │  ├───────────┤  │
        │  │   Auth    │  │
        │  │(magic link│  │
        │  ├───────────┤  │
        │  │ Functions │  │
        │  │(queries,  │  │
        │  │ mutations,│  │
        │  │ actions)  │  │
        │  └───────────┘  │
        └─────────────────┘
                 │
        ┌────────┴────────┐
        │    Supabase     │
        │  File Storage   │
        │     (kept)      │
        └─────────────────┘
```

## What Gets Replaced

| Current | Replacement | Notes |
|---------|-------------|-------|
| Supabase PostgreSQL | Convex document DB | Schema migration needed |
| Drizzle ORM | Convex schema + validators | Type-safe, different paradigm |
| Supabase Auth | Convex Auth | Magic link with Resend |
| Redis stream buffers | Persistent Text Streaming component | Built for AI streaming |
| Redis Pub/Sub | Convex reactive queries | Automatic, no code needed |
| Custom WebSocket server | Eliminated | Convex handles real-time |
| `packages/db` | `convex/` folder | New location for backend |
| oRPC API | Convex functions | Can keep oRPC as thin wrapper if needed |

## What Stays

- **Supabase File Storage** - Keep for file uploads, Convex stores URLs
- **Vercel AI SDK** - Stays for AI model orchestration
- **React/Expo clients** - Minimal changes, swap data fetching hooks
- **Stripe integration** - Convex has a Stripe component

---

## Phase 1: Project Setup & Schema Migration

### 1.1 Initialize Convex

```bash
cd /Users/andrey-m/Code_local/ai-app
npx convex init
```

Creates `convex/` folder at project root with:
- `convex/_generated/` - Auto-generated types
- `convex/schema.ts` - Database schema
- `convex.json` - Config

### 1.2 Convert Drizzle Schema to Convex

**Current Drizzle schema location:** `packages/db/src/schema/`

#### Users Table
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Convex Auth will add: tokenIdentifier, email, etc.
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    unlimitedAccessGrantedAt: v.optional(v.number()), // timestamp
    hideEmailInUi: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
});
```

#### Chats Table
```typescript
  chats: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    isMultiUser: v.boolean(),
    parentChatId: v.optional(v.id("chats")),
    branchPointMessageId: v.optional(v.id("messages")),
    activeStreamId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId"]) // sort by _creationTime
    .index("by_parent", ["parentChatId"]),
```

#### Messages Table
```typescript
  messages: defineTable({
    chatId: v.id("chats"),
    visibleId: v.string(), // UI-facing ID (nanoid)
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool")
    ),
    model: v.optional(v.string()),
    order: v.number(),
    // Metadata as nested object (Convex supports nested)
    metadata: v.optional(v.object({
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      cost: v.optional(v.number()),
      finishReason: v.optional(v.string()),
      latencyMs: v.optional(v.number()),
      providerMetadata: v.optional(v.any()),
    })),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_order", ["chatId", "order"]),
```

#### Parts Table (Message Content)
```typescript
  parts: defineTable({
    messageId: v.id("messages"),
    type: v.union(
      v.literal("text"),
      v.literal("reasoning"),
      v.literal("source"),
      v.literal("tool-invocation"),
      v.literal("file")
    ),
    order: v.number(),
    // Text part
    textContent: v.optional(v.string()),
    // Reasoning part
    reasoningContent: v.optional(v.string()),
    // Source part
    sourceUrl: v.optional(v.string()),
    sourceTitle: v.optional(v.string()),
    // Tool invocation part
    toolCallId: v.optional(v.string()),
    toolName: v.optional(v.string()),
    toolState: v.optional(v.union(
      v.literal("partial-call"),
      v.literal("call"),
      v.literal("approval"),
      v.literal("result")
    )),
    toolInput: v.optional(v.any()),
    toolOutput: v.optional(v.any()),
    toolError: v.optional(v.string()),
    // File part
    fileUrl: v.optional(v.string()), // Supabase storage URL
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  })
    .index("by_message", ["messageId"])
    .index("by_message_order", ["messageId", "order"])
    .index("by_tool_call", ["toolCallId"]),
```

#### Chat Members Table
```typescript
  chatMembers: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    displayName: v.optional(v.string()),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"])
    .index("by_chat_user", ["chatId", "userId"]),
```

#### Supporting Tables
```typescript
  // MCP servers and tools
  mcpServers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    url: v.string(),
    isEnabled: v.boolean(),
  }).index("by_user", ["userId"]),

  mcpTools: defineTable({
    serverId: v.id("mcpServers"),
    name: v.string(),
    description: v.optional(v.string()),
    inputSchema: v.optional(v.any()),
    isEnabled: v.boolean(),
  }).index("by_server", ["serverId"]),

  // User rules/prompts
  userRules: defineTable({
    userId: v.id("users"),
    name: v.string(),
    content: v.string(),
    isEnabled: v.boolean(),
  }).index("by_user", ["userId"]),

  // Usage tracking
  usage: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    generationCount: v.number(),
    tokenCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Message feedback
  feedback: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    rating: v.union(v.literal("positive"), v.literal("negative")),
    comment: v.optional(v.string()),
  }).index("by_message", ["messageId"]),

  // Chat invites
  chatInvites: defineTable({
    chatId: v.id("chats"),
    inviterId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_chat", ["chatId"]),

  // Persistent text streaming (component will add its own tables)
```

---

## Phase 2: Convex Auth Setup

### 2.1 Install Convex Auth

```bash
npm install @convex-dev/auth
```

### 2.2 Configure Auth with Resend

```typescript
// convex/auth.config.ts
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "@convex-dev/auth/providers/ResendOTP";
import Resend from "@auth/core/providers/resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    ResendOTP({
      id: "resend-otp",
      apiKey: process.env.RESEND_API_KEY,
      // Magic link configuration
    }),
  ],
});
```

### 2.3 Environment Variables

```bash
# .env.local
CONVEX_DEPLOYMENT=your-deployment
RESEND_API_KEY=re_xxxxx
```

### 2.4 Auth Functions

```typescript
// convex/auth.ts
import { query, mutation } from "./_generated/server";
import { auth } from "./auth.config";

export const currentUser = query({
  handler: async (ctx) => {
    const identity = await auth.getUserIdentity(ctx);
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .unique();
  },
});

export const createOrGetUser = mutation({
  handler: async (ctx) => {
    const identity = await auth.getUserIdentity(ctx);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      email: identity.email!,
      firstName: identity.givenName,
      lastName: identity.familyName,
    });
  },
});
```

### 2.5 Client-Side Auth

```typescript
// apps/web/src/providers/ConvexAuthProvider.tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

---

## Phase 3: Core Database Functions

### 3.1 Chat Functions

```typescript
// convex/chats.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const chat = await ctx.db.get(chatId);
    if (!chat) return null;

    // Check access (owner or member)
    if (chat.userId !== user._id) {
      const membership = await ctx.db
        .query("chatMembers")
        .withIndex("by_chat_user", (q) =>
          q.eq("chatId", chatId).eq("userId", user._id)
        )
        .unique();
      if (!membership) return null;
    }

    return chat;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, { title }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("chats", {
      userId: user._id,
      title,
      isMultiUser: false,
    });
  },
});

export const updateTitle = mutation({
  args: {
    chatId: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, { chatId, title }) => {
    await ctx.db.patch(chatId, { title });
  },
});

export const remove = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    // Delete all messages and parts (cascade)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();

    for (const message of messages) {
      const parts = await ctx.db
        .query("parts")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();
      for (const part of parts) {
        await ctx.db.delete(part._id);
      }
      await ctx.db.delete(message._id);
    }

    // Delete chat members
    const members = await ctx.db
      .query("chatMembers")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(chatId);
  },
});
```

### 3.2 Message Functions

```typescript
// convex/messages.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_order", (q) => q.eq("chatId", chatId))
      .collect();

    // Load parts for each message
    const messagesWithParts = await Promise.all(
      messages.map(async (message) => {
        const parts = await ctx.db
          .query("parts")
          .withIndex("by_message_order", (q) => q.eq("messageId", message._id))
          .collect();
        return { ...message, parts };
      })
    );

    return messagesWithParts;
  },
});

export const saveMessage = mutation({
  args: {
    chatId: v.id("chats"),
    visibleId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool")
    ),
    model: v.optional(v.string()),
    order: v.number(),
    parts: v.array(v.any()), // Part data
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { chatId, visibleId, role, model, order, parts, metadata }) => {
    // Check if message exists (upsert)
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_chat_order", (q) => q.eq("chatId", chatId).eq("order", order))
      .unique();

    let messageId: Id<"messages">;

    if (existing) {
      await ctx.db.patch(existing._id, { model, metadata });
      messageId = existing._id;

      // Delete old parts
      const oldParts = await ctx.db
        .query("parts")
        .withIndex("by_message", (q) => q.eq("messageId", messageId))
        .collect();
      for (const part of oldParts) {
        await ctx.db.delete(part._id);
      }
    } else {
      messageId = await ctx.db.insert("messages", {
        chatId,
        visibleId,
        role,
        model,
        order,
        metadata,
      });
    }

    // Insert new parts
    for (let i = 0; i < parts.length; i++) {
      await ctx.db.insert("parts", {
        messageId,
        order: i,
        ...parts[i],
      });
    }

    return messageId;
  },
});

export const deleteFromOrder = mutation({
  args: {
    chatId: v.id("chats"),
    fromOrder: v.number(),
  },
  handler: async (ctx, { chatId, fromOrder }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.gte(q.field("order"), fromOrder))
      .collect();

    for (const message of messages) {
      const parts = await ctx.db
        .query("parts")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();
      for (const part of parts) {
        await ctx.db.delete(part._id);
      }
      await ctx.db.delete(message._id);
    }
  },
});
```

---

## Phase 4: Persistent Text Streaming

### 4.1 Install Component

```bash
npm install @convex-dev/persistent-text-streaming
```

### 4.2 Configure Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config";

const app = defineApp();
app.use(persistentTextStreaming);

export default app;
```

### 4.3 Streaming Action

```typescript
// convex/chat/stream.ts
import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { streamText } from "ai";

export const startStream = action({
  args: {
    chatId: v.id("chats"),
    messages: v.array(v.any()),
    model: v.string(),
  },
  handler: async (ctx, { chatId, messages, model }) => {
    // Create stream in persistent streaming component
    const { streamId, stream } = await components.persistentTextStreaming.lib.createStream(ctx);

    // Update chat with active stream
    await ctx.runMutation(internal.chats.setActiveStream, { chatId, streamId });

    // Run AI streaming
    const result = await streamText({
      model: getModel(model),
      messages,
    });

    // Stream chunks to persistent storage
    await components.persistentTextStreaming.lib.stream(ctx, streamId, async function* () {
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    });

    // Save final message
    await ctx.runMutation(internal.messages.saveAssistantMessage, {
      chatId,
      streamId,
      model,
      usage: await result.usage,
    });

    // Clear active stream
    await ctx.runMutation(internal.chats.clearActiveStream, { chatId });
  },
});

export const stopStream = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const chat = await ctx.db.get(chatId);
    if (!chat?.activeStreamId) return;

    // Get current stream content
    const content = await components.persistentTextStreaming.lib.getStreamBody(
      ctx,
      chat.activeStreamId
    );

    // Save partial message
    await savePartialMessage(ctx, chatId, content);

    // Clear stream
    await ctx.db.patch(chatId, { activeStreamId: undefined });
  },
});
```

### 4.4 Client Hook

```typescript
// apps/web/src/hooks/useChatStream.ts
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { api } from "@convex/_generated/api";

export function useChatStream(chatId: Id<"chats">, streamId: string | null) {
  const { content, status } = useStream(
    api.streaming.getStreamBody,
    `${import.meta.env.VITE_CONVEX_URL}/stream`,
    !!streamId,
    streamId
  );

  return { content, status };
}
```

---

## Phase 5: Real-Time Subscriptions (Replaces Redis Pub/Sub)

### 5.1 Reactive Queries - Automatic!

```typescript
// Client - messages update automatically when DB changes
const messages = useQuery(api.messages.getByChatId, { chatId });

// Client - chat list updates automatically
const chats = useQuery(api.chats.list);
```

No WebSocket code needed. Convex handles subscriptions automatically.

### 5.2 Presence System

```typescript
// convex/presence.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const heartbeat = mutation({
  args: {
    chatId: v.id("chats"),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, displayName }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", chatId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        displayName,
      });
    } else {
      await ctx.db.insert("presence", {
        chatId,
        userId: user._id,
        displayName,
        lastSeen: Date.now(),
      });
    }
  },
});

export const getActiveMembers = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const cutoff = Date.now() - 60000; // 60 seconds

    return await ctx.db
      .query("presence")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect();
  },
});
```

### 5.3 Typing Indicators

```typescript
// convex/typing.ts
export const setTyping = mutation({
  args: {
    chatId: v.id("chats"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { chatId, isTyping }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;

    // Update presence with typing state
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", chatId).eq("userId", user._id)
      )
      .unique();

    if (presence) {
      await ctx.db.patch(presence._id, { isTyping });
    }
  },
});

export const getTypingUsers = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("presence")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("isTyping"), true))
      .collect();
  },
});
```

---

## Phase 6: Client Migration

### 6.1 Install Convex Client

```bash
npm install convex
```

### 6.2 Provider Setup

```typescript
// apps/web/src/main.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

root.render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>
);
```

### 6.3 Hook Migration Examples

**Before (oRPC + React Query):**
```typescript
const { data: chats } = orpc.chats.list.useQuery();
```

**After (Convex):**
```typescript
const chats = useQuery(api.chats.list);
```

**Before (WebSocket for real-time):**
```typescript
useEffect(() => {
  ws.send(JSON.stringify({ type: 'join_chat', chatId }));
  ws.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type === 'stream_chunk') {
      // handle chunk
    }
  };
}, [chatId]);
```

**After (Convex - automatic):**
```typescript
// Just use the query - it's automatically reactive
const messages = useQuery(api.messages.getByChatId, { chatId });
```

---

## Phase 7: Data Migration

### 7.1 Export from Supabase

```sql
-- Export users
COPY (SELECT * FROM public.users) TO '/tmp/users.csv' WITH CSV HEADER;

-- Export chats
COPY (SELECT * FROM chats) TO '/tmp/chats.csv' WITH CSV HEADER;

-- Export messages
COPY (SELECT * FROM messages) TO '/tmp/messages.csv' WITH CSV HEADER;

-- Export parts
COPY (SELECT * FROM parts) TO '/tmp/parts.csv' WITH CSV HEADER;
```

### 7.2 Import to Convex

```typescript
// convex/migrations/import.ts
import { internalAction } from "../_generated/server";

export const importUsers = internalAction({
  handler: async (ctx) => {
    const users = await fetchCsvData('/tmp/users.csv');

    for (const user of users) {
      await ctx.runMutation(internal.migrations.insertUser, {
        oldId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        // ... map fields
      });
    }
  },
});

// Run via Convex dashboard or CLI
```

### 7.3 ID Mapping

Keep a mapping of old Supabase UUIDs to new Convex IDs during migration:

```typescript
// convex/schema.ts (temporary)
idMappings: defineTable({
  tableName: v.string(),
  oldId: v.string(),
  newId: v.string(),
})
  .index("by_table_old", ["tableName", "oldId"]),
```

---

## Phase 8: Cleanup

### 8.1 Remove Dependencies

```bash
npm uninstall @supabase/supabase-js @supabase/ssr drizzle-orm @upstash/redis
```

### 8.2 Delete Old Code

- `packages/db/` - Entire package (replaced by `convex/`)
- `packages/server/src/lib/redis/` - Redis utilities
- `packages/server/src/lib/websocket/` - WebSocket server
- `packages/server/src/lib/supabase/` - Supabase client (keep file storage utils)
- `apps/web/src/server/index.ts` - WebSocket upgrade handler

### 8.3 Update Environment Variables

Remove:
```
DATABASE_URL
DIRECT_URL
SUPABASE_URL (if not keeping files)
SUPABASE_ANON_KEY (if not keeping files)
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
```

Add:
```
CONVEX_DEPLOYMENT
VITE_CONVEX_URL
```

---

## Migration Checklist

### Phase 1: Setup
- [ ] Initialize Convex project
- [ ] Define schema in `convex/schema.ts`
- [ ] Deploy schema to Convex

### Phase 2: Auth
- [ ] Configure Convex Auth with Resend
- [ ] Set up magic link email templates
- [ ] Test auth flow (sign up, sign in, sign out)

### Phase 3: Core Functions
- [ ] Implement user functions
- [ ] Implement chat functions
- [ ] Implement message functions
- [ ] Implement parts handling

### Phase 4: Streaming
- [ ] Install persistent text streaming component
- [ ] Implement streaming action
- [ ] Implement stop stream mutation
- [ ] Test streaming with AI models

### Phase 5: Real-time
- [ ] Implement presence system
- [ ] Implement typing indicators
- [ ] Test multi-user sync

### Phase 6: Client
- [ ] Set up Convex provider
- [ ] Migrate hooks from oRPC to Convex
- [ ] Remove WebSocket code
- [ ] Test all client features

### Phase 7: Data Migration
- [ ] Export Supabase data
- [ ] Create import scripts
- [ ] Run migration
- [ ] Verify data integrity

### Phase 8: Cleanup
- [ ] Remove old packages
- [ ] Delete old code
- [ ] Update environment variables
- [ ] Final testing

---

## Risk Mitigation

1. **Run in parallel first** - Keep Supabase running while testing Convex
2. **Feature flag** - Add a flag to switch between backends during transition
3. **Incremental migration** - Migrate one feature at a time (auth → chats → streaming)
4. **Rollback plan** - Keep Supabase data and code until fully verified

## Resources

- [Convex Docs](https://docs.convex.dev)
- [Convex Auth](https://docs.convex.dev/auth/convex-auth)
- [Persistent Text Streaming](https://www.convex.dev/components/persistent-text-streaming)
- [Convex + Resend](https://docs.convex.dev/auth/config/email)
