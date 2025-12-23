# API Package

Type-safe API layer using oRPC for end-to-end type safety between client and server.

## Route Status

### ✅ oRPC Routes (Type-Safe)

These routes are handled via oRPC and provide full type safety. Access via `/rpc/*` endpoint.

| Route                              | Procedure                     | Method | Auth      | Description                                               |
| ---------------------------------- | ----------------------------- | ------ | --------- | --------------------------------------------------------- |
| `/rpc/auth/magicLink`              | `auth.magicLink`              | -      | Public    | Send magic link email                                     |
| `/rpc/chat/stop`                   | `chat.stop`                   | -      | Protected | Stop active stream for a chat                             |
| `/rpc/chats/list`                  | `chats.list`                  | -      | Protected | List all chats for current user                           |
| `/rpc/chats/create`                | `chats.create`                | -      | Protected | Create a new chat                                         |
| `/rpc/chats/update`                | `chats.update`                | -      | Protected | Update chat title                                         |
| `/rpc/chats/delete`                | `chats.delete`                | -      | Protected | Delete a chat                                             |
| `/rpc/chats/getLastAssistantModel` | `chats.getLastAssistantModel` | -      | Protected | Get model from last assistant message in most recent chat |
| `/rpc/messages/list`               | `messages.list`               | -      | Protected | List all messages for a chat                              |
| `/rpc/messages/getLastModel`       | `messages.getLastModel`       | -      | Protected | Get model from last message in a chat                     |
| `/rpc/models/list`                 | `models.list`                 | -      | Public    | List all available AI models                              |

### 🔄 Bun HTTP Routes (Legacy)

These routes are still handled directly via Bun HTTP handlers. Will be migrated to oRPC in the future.

| Route                       | Method                   | Auth     | Status           | Notes                                               |
| --------------------------- | ------------------------ | -------- | ---------------- | --------------------------------------------------- |
| `/api/chats`                | GET, POST, PATCH, DELETE | Required | ⚠️ Legacy        | Use oRPC `chats.*` procedures instead               |
| `/api/chats/last-model`     | GET                      | Required | ⚠️ Legacy        | Use oRPC `chats.getLastAssistantModel` instead      |
| `/api/chats/:id/messages`   | GET                      | Required | ⚠️ Legacy        | Use oRPC `messages.list` instead                    |
| `/api/chats/:id/last-model` | GET                      | Required | ⚠️ Legacy        | Use oRPC `messages.getLastModel` instead            |
| `/api/chat/stop`            | POST                     | Required | ⚠️ Legacy        | Use oRPC `chat.stop` instead                        |
| `/api/models`               | GET                      | Public   | ⚠️ Legacy        | Use oRPC `models.list` instead                      |
| `/api/auth/magic-link`      | POST                     | Public   | ⚠️ Legacy        | Use oRPC `auth.magicLink` instead                   |
| `/api/chat`                 | POST                     | Required | 🔄 Streaming     | Complex streaming with file handling - keep as HTTP |
| `/api/chat/:id/stream`      | GET                      | Required | 🔄 SSE Streaming | Server-Sent Events streaming - keep as HTTP         |
| `/api/transcribe`           | POST                     | Required | 🔄 File Upload   | Multipart form-data file upload - keep as HTTP      |

## Migration Status

- ✅ **Migrated to oRPC**: Chats CRUD, Messages, Models, Auth (magic link), Chat stop
- 🔄 **Keep as HTTP**: Streaming endpoints (SSE), file uploads (multipart/form-data)
- ⚠️ **Legacy (to be removed)**: Old HTTP endpoints that duplicate oRPC functionality

## Usage

### Client-Side

```typescript
import { createClient } from "@yapmate/api/client";

const client = createClient("http://localhost:3000");

// Type-safe API calls
const chats = await client.chats.list();
const newChat = await client.chats.create({ id: "uuid", title: "My Chat" });
const messages = await client.messages.list({ chatId: "uuid" });
```

### Server-Side

The oRPC router is mounted at `/rpc/*` in `apps/web/src/server/index.ts`:

```typescript
import { router } from "@yapmate/api/router";

const rpcHandler = new RPCHandler(router);
```

## Architecture

- **Schemas**: Zod schemas generated from Drizzle tables (in `packages/db/src/schema/zod.ts`)
- **Routers**: Organized by domain (`chats`, `messages`, `models`, `auth`, `chat`)
- **Middleware**: Authentication middleware (`publicProcedure`, `protectedProcedure`)
- **Types**: End-to-end type safety via TypeScript inference from router definition
