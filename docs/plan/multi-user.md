# Multi-User Chat Feature Plan

## Overview

Enable multiple users to participate in the same chat conversation in real-time, with presence indicators, typing status, and proper message attribution.

## Current Architecture

```
chats (userId = owner)
  └─ messages (no userId - ownership implicit)
       └─ parts (text, reasoning, tool-invocation, file...)

Real-time: Redis Pub/Sub → WebSocket (per-user channels: user:${userId})
Streaming: Redis buffer → save to Postgres on complete
```

## Target Architecture

```
chats (userId = owner)
  └─ chat_members (userId, role: owner|member)
  └─ messages (userId = who sent it)
       └─ parts

Real-time: Redis Pub/Sub → WebSocket (chat channels: chat:${chatId})
Presence: Redis keys with TTL (chat:${chatId}:presence:${userId})
Typing: Redis Pub/Sub (chat:${chatId}:typing)
```

---

## Part 1: Schema Changes

### 1.1 Add `userId` to messages table

**File:** `packages/db/src/schema/messages.ts`

```typescript
export const messages = pgTable("messages", {
  // ... existing fields

  /** User who sent this message (null for assistant messages) */
  userId: uuid().references(() => users.id, { onDelete: "set null" }),

  // ... rest
});
```

**Migration strategy:**
- Add column as nullable
- Backfill existing user messages: `UPDATE messages SET userId = (SELECT userId FROM chats WHERE chats.id = messages.chatId) WHERE role = 'user'`
- Keep nullable (assistant messages don't have userId)

### 1.2 Create `chat_members` table

**File:** `packages/db/src/schema/chat-members.ts` (new file)

```typescript
export const MEMBER_ROLES = ["owner", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const chatMembers = pgTable("chat_members", {
  id: uuid().primaryKey().defaultRandom(),
  chatId: uuid().notNull().references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text().$type<MemberRole>().notNull().default("member"),
  /** Display name in this chat (required for multi-user) */
  displayName: text().notNull(),
  ...timestamps,
}, (table) => [
  index("chat_members_chat_id_idx").on(table.chatId),
  index("chat_members_user_id_idx").on(table.userId),
  // Unique constraint: user can only be member once per chat
  unique("chat_members_chat_user_unique").on(table.chatId, table.userId),
]);
```

**Why `displayName` on chat_members (not users)?**
- User might want different names in different chats
- Avoids requiring global name change
- Captured at join time

### 1.3 Add `isMultiUser` flag to chats (optional)

Could help with:
- UI decisions (show member list or not)
- Query optimization (skip member lookups for single-user chats)

```typescript
// In chats table
isMultiUser: boolean().default(false).notNull(),
```

### 1.4 Require displayName for multi-user participation

**Enforcement:** When user tries to join/create a multi-user chat:
1. Check if they have `firstName` in users table
2. If not, prompt them to enter a display name
3. Store in `chat_members.displayName`

---

## Part 2: Real-Time Infrastructure (Redis + WebSocket)

### 2.1 Extend WebSocket event types

**File:** `packages/server/src/lib/websocket/types.ts`

```typescript
export type WsEventType =
  // Existing
  | "chat_created"
  | "chat_updated"
  | "message_created"
  | "stream_started"
  // New for multi-user
  | "member_joined"
  | "member_left"
  | "member_typing"
  | "member_stopped_typing"
  | "presence_update"
  | "stream_chunk";      // For broadcasting AI response to all members

export type WsEvent = {
  type: WsEventType;
  chatId?: string;
  userId?: string;
  displayName?: string;
  hasActiveStream?: boolean;
  // For stream chunks
  chunk?: unknown;
  chunkIndex?: number;
  // For presence
  onlineMembers?: Array<{ userId: string; displayName: string }>;
};
```

### 2.2 Add chat-level channel subscription

**File:** `packages/server/src/lib/websocket/redis-bridge.ts`

Add new functions alongside existing user-channel logic:

```typescript
/**
 * Subscribe to a chat channel for multi-user sync
 */
export const subscribeToChatChannel = async (chatId: string): Promise<void> => {
  const channel = `chat:${chatId}`;
  if (subscribedChannels.has(channel)) return;

  await subscriber.subscribe(channel, (message) => {
    const event = JSON.parse(message) as WsEvent;
    // Broadcast to all members of this chat who are connected
    broadcastToChatMembers(chatId, event);
  });

  subscribedChannels.add(channel);
};

/**
 * Publish event to all members of a chat
 */
export const publishChatEvent = async (
  chatId: string,
  event: WsEvent
): Promise<void> => {
  const channel = `chat:${chatId}`;
  await redis.publish(channel, JSON.stringify(event));
};
```

### 2.3 Track which chats each WebSocket is watching

**File:** `packages/server/src/lib/websocket/manager.ts`

```typescript
// Existing: userId -> Set<WebSocket>
const userConnections = new Map<string, Set<ServerWebSocket<WsClientData>>>();

// New: chatId -> Set<WebSocket>
const chatConnections = new Map<string, Set<ServerWebSocket<WsClientData>>>();

// New: WebSocket -> Set<chatIds> (for cleanup)
const connectionChats = new WeakMap<ServerWebSocket<WsClientData>, Set<string>>();

export const joinChat = async (
  chatId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  // Add to chat connections
  const connections = chatConnections.get(chatId) ?? new Set();
  connections.add(ws);
  chatConnections.set(chatId, connections);

  // Track which chats this connection is in
  const chats = connectionChats.get(ws) ?? new Set();
  chats.add(chatId);
  connectionChats.set(ws, chats);

  // Subscribe to chat channel
  await subscribeToChatChannel(chatId);
};

export const leaveChat = async (
  chatId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  // Remove from chat connections
  const connections = chatConnections.get(chatId);
  connections?.delete(ws);

  // Update connection's chat list
  const chats = connectionChats.get(ws);
  chats?.delete(chatId);
};

export const broadcastToChat = (chatId: string, event: WsEvent): void => {
  const connections = chatConnections.get(chatId);
  if (!connections) return;

  const payload = JSON.stringify(event);
  for (const ws of connections) {
    if (ws.readyState === 1) ws.send(payload);
  }
};
```

---

## Part 3: Presence System

### 3.1 Redis keys for presence

```
chat:{chatId}:presence:{userId} = { displayName, lastSeen } (TTL: 60s)
```

### 3.2 Presence heartbeat

Client sends heartbeat every 30s while chat is open:

```typescript
// Client
setInterval(() => {
  ws.send(JSON.stringify({
    type: "heartbeat",
    chatId
  }));
}, 30000);
```

Server updates Redis key:

```typescript
// Server WebSocket handler
if (message.type === "heartbeat") {
  await redis.set(
    `chat:${chatId}:presence:${userId}`,
    JSON.stringify({ displayName, lastSeen: Date.now() }),
    "EX", 60  // 60 second TTL
  );
}
```

### 3.3 Get online members

```typescript
export const getOnlineMembers = async (chatId: string): Promise<Array<{
  userId: string;
  displayName: string;
}>> => {
  const pattern = `chat:${chatId}:presence:*`;
  const keys = await redis.keys(pattern);

  const members = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const userId = key.split(":").pop()!;
      members.push({ userId, ...JSON.parse(data) });
    }
  }
  return members;
};
```

---

## Part 4: Typing Indicators

### 4.1 Typing events via Redis Pub/Sub

When user starts typing:
```typescript
await publishChatEvent(chatId, {
  type: "member_typing",
  chatId,
  userId,
  displayName,
});
```

When user stops typing (debounced, ~2s after last keystroke):
```typescript
await publishChatEvent(chatId, {
  type: "member_stopped_typing",
  chatId,
  userId,
});
```

### 4.2 Client-side typing state

```typescript
// Track who is typing
const [typingUsers, setTypingUsers] = useState<Map<string, string>>();

// On typing event
if (event.type === "member_typing") {
  setTypingUsers(prev => new Map(prev).set(event.userId, event.displayName));
}
if (event.type === "member_stopped_typing") {
  setTypingUsers(prev => {
    const next = new Map(prev);
    next.delete(event.userId);
    return next;
  });
}
```

---

## Part 5: Streaming to Multiple Users

### 5.1 Current flow (single user)

```
User sends message
  → Server creates stream
  → Chunks go to Redis buffer + direct HTTP response
  → On complete: save to Postgres
```

### 5.2 Multi-user flow

```
User A sends message
  → Server creates stream
  → Chunks go to:
      1. Redis buffer (for resumability)
      2. Redis Pub/Sub chat:{chatId} (for User B, C, etc.)
      3. HTTP response to User A
  → On complete: save to Postgres
  → Publish message_created to chat channel
```

### 5.3 Implementation changes

**File:** `packages/server/src/routes/api/chat/stream.ts`

Modify stream writer to also publish to chat channel:

```typescript
const writer = {
  write: async (chunk: StreamChunk) => {
    // Existing: buffer in Redis
    await publishStreamChunk(streamId, chunk);

    // New: broadcast to chat members
    await publishChatEvent(chatId, {
      type: "stream_chunk",
      chatId,
      chunk: chunk.data,
      chunkIndex: chunk.index,
    });
  }
};
```

### 5.4 Client handling for other users

When User B receives stream chunks:

```typescript
// In useChat or custom hook
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "stream_chunk" && data.chatId === currentChatId) {
    // Append to current assistant message being streamed
    appendToStreamingMessage(data.chunk);
  }

  if (data.type === "message_created" && data.chatId === currentChatId) {
    // Refresh messages from server or use the payload
    refetchMessages();
  }
};
```

---

## Part 6: Model Message Format

> **Note:** The AI SDK's `UserModelMessage` type does NOT support a `name` property.
> The type only includes `role`, `content`, and `providerOptions`. While raw OpenAI/Anthropic
> APIs support `name`, the AI SDK abstracts this away. We use content prefixing instead.

### 6.1 Prefix usernames to message content

**File:** `packages/server/src/routes/api/chat/ai-response.ts`

```typescript
// Build user name map from chat members
const memberNames = await getChatMemberNames(chatId);

// When preparing messages for model - prefix username to content
const messagesForModel = messages.map(msg => {
  if (msg.role === "user" && msg.userId) {
    const displayName = memberNames.get(msg.userId) || "User";
    const prefixedContent = prefixContentWithUsername(msg.content, displayName);
    return {
      ...msg,
      content: prefixedContent,
    };
  }
  return msg;
});

/**
 * Prefix username to message content.
 * Handles both string content and array content (multimodal messages).
 */
function prefixContentWithUsername(
  content: string | ContentPart[],
  displayName: string
): string | ContentPart[] {
  const prefix = `[${displayName}]: `;

  if (typeof content === "string") {
    return prefix + content;
  }

  // For array content, prepend a text part with the username
  return [
    { type: "text", text: prefix },
    ...content,
  ];
}
```

### 6.2 System prompt update

Add context explaining the username format so the model understands how to interpret and respond:

```typescript
const multiUserSystemPrompt = `
This is a multi-user conversation. User messages are prefixed with the sender's name in square brackets, like [Alice]: or [Bob]:.

Guidelines for multi-user conversations:
- Address users by name when responding to specific questions or comments
- When multiple users are discussing, acknowledge different perspectives
- If a user asks a follow-up to another user's question, maintain context
- Be inclusive and respond to all participants appropriately
`;
```

### 6.3 Helper to get member names

**File:** `packages/db/src/service/chat-members.ts`

```typescript
/**
 * Get a map of userId -> displayName for all members of a chat.
 * Used when formatting messages for the model.
 */
export const getChatMemberNames = async (
  chatId: string
): Promise<Map<string, string>> => {
  const members = await db.query.chatMembers.findMany({
    where: eq(chatMembers.chatId, chatId),
    columns: { userId: true, displayName: true },
  });

  return new Map(members.map(m => [m.userId, m.displayName]));
};
```

---

## Part 7: Access Control

### 7.1 Check membership on all operations

**File:** `packages/server/src/routes/api/chat/handler.ts`

```typescript
// Replace simple owner check
if (chat.userId !== userId) {
  return new Response("Forbidden", { status: 403 });
}

// With membership check
const membership = await getChatMembership(chatId, userId);
if (!membership) {
  return new Response("Forbidden", { status: 403 });
}
```

### 7.2 Membership service functions

**File:** `packages/db/src/service/chat-members.ts` (new)

```typescript
export const getChatMembership = async (chatId: string, userId: string) => {
  return db.query.chatMembers.findFirst({
    where: and(
      eq(chatMembers.chatId, chatId),
      eq(chatMembers.userId, userId)
    ),
  });
};

export const getChatMembers = async (chatId: string) => {
  return db.query.chatMembers.findMany({
    where: eq(chatMembers.chatId, chatId),
  });
};

export const addChatMember = async (
  chatId: string,
  userId: string,
  displayName: string,
  role: MemberRole = "member"
) => {
  return db.insert(chatMembers).values({
    chatId,
    userId,
    displayName,
    role,
  });
};

export const removeChatMember = async (chatId: string, userId: string) => {
  // Only owner can remove, and can't remove themselves
  return db.delete(chatMembers).where(
    and(
      eq(chatMembers.chatId, chatId),
      eq(chatMembers.userId, userId),
      ne(chatMembers.role, "owner")
    )
  );
};
```

---

## Part 8: API Endpoints

### 8.1 New endpoints needed

```
POST /api/chat/:id/invite
  - Generate invite link or add user directly
  - Body: { userId?: string } or returns { inviteCode: string }

POST /api/chat/:id/join
  - Join via invite code
  - Body: { inviteCode: string, displayName: string }

DELETE /api/chat/:id/members/:userId
  - Remove member (owner only)

GET /api/chat/:id/members
  - List members with online status

POST /api/chat/:id/presence
  - Heartbeat for presence
```

### 8.2 Invite system options

**Option A: Direct user ID**
- Owner enters email/username
- Server looks up user, adds to chat_members

**Option B: Invite link**
- Generate unique code, store in Redis with TTL (24h)
- `chat:{chatId}:invite:{code} = { createdBy, expiresAt }`
- Anyone with link can join

Recommend **Option B** for simplicity and not requiring user lookup.

---

## Part 9: Client-Side Changes

### 9.1 New hooks/state

```typescript
// useMultiUserChat.ts
export const useMultiUserChat = (chatId: string) => {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());
  const [typingMembers, setTypingMembers] = useState<Map<string, string>>(new Map());

  // WebSocket subscription
  useEffect(() => {
    ws.send(JSON.stringify({ type: "join_chat", chatId }));

    return () => {
      ws.send(JSON.stringify({ type: "leave_chat", chatId }));
    };
  }, [chatId]);

  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      ws.send(JSON.stringify({ type: "heartbeat", chatId }));
    }, 30000);
    return () => clearInterval(interval);
  }, [chatId]);

  // ... handle events
};
```

### 9.2 UI components needed

- `MemberList` - shows members with online indicators
- `TypingIndicator` - "Alice is typing..."
- `InviteModal` - generate/share invite link
- `JoinChatPage` - for invite link recipients
- `MemberAvatar` - show who sent each message

---

## Part 10: Migration & Rollout

### Phase 1: Schema & Backend
1. Add `userId` column to messages
2. Create `chat_members` table
3. Backfill existing chats (owner as sole member)
4. Update handler.ts to save userId on messages

### Phase 2: Real-time Infrastructure
1. Extend WebSocket types
2. Add chat-level channel subscription
3. Implement presence system
4. Implement typing indicators

### Phase 3: Multi-user Streaming
1. Modify stream writer to broadcast chunks
2. Add client-side stream reception for non-sender

### Phase 4: Invite System & UI
1. Create invite endpoints
2. Build member list UI
3. Build invite/join flow

### Phase 5: Model Integration
1. Pass displayNames to model
2. Update system prompt for multi-user context

---

## Open Questions

1. **Message editing in multi-user context** - Who can edit? Only author? How to handle if someone is mid-read?

2. **Regeneration with multiple users** - If User A regenerates, does User B see it happen? Need consensus?

3. **Rate limiting** - Per-user or per-chat? If User A hits limit, can User B still send?

4. **History visibility** - Can new members see messages from before they joined?

5. **Notifications** - Email/push when someone messages in shared chat while you're away?

---

## File Changes Summary

### New Files
- `packages/db/src/schema/chat-members.ts`
- `packages/db/src/service/chat-members.ts`
- `packages/server/src/routes/api/chat/members.ts`
- `packages/server/src/routes/api/chat/invite.ts`
- `packages/web/src/hooks/useMultiUserChat.ts`
- `packages/web/src/components/chat/MemberList.tsx`
- `packages/web/src/components/chat/InviteModal.tsx`

### Modified Files
- `packages/db/src/schema/messages.ts` - add userId
- `packages/db/src/schema/index.ts` - export chat-members
- `packages/server/src/lib/websocket/types.ts` - new event types
- `packages/server/src/lib/websocket/manager.ts` - chat connections
- `packages/server/src/lib/websocket/redis-bridge.ts` - chat channels
- `packages/server/src/routes/api/chat/handler.ts` - membership checks, userId on save
- `packages/server/src/routes/api/chat/stream.ts` - broadcast chunks
- `packages/server/src/routes/api/chat/ai-response.ts` - pass names to model
