# Migration Guide: Next.js to Bun Server

This document outlines the migration strategy from Next.js to Bun's native server (`Bun.serve()`).

## Overview

### Current Stack (Next.js)

- **Framework**: Next.js 16 with App Router
- **Runtime**: Bun (via `bun --bun next`)
- **Auth**: Supabase with SSR cookies
- **Database**: Drizzle ORM + PostgreSQL
- **Frontend**: React 19, React Query, shadcn/ui
- **AI**: Vercel AI SDK + OpenRouter

### Target Stack (Bun Server)

- **Server**: `Bun.serve()` with routes
- **Frontend**: HTML imports with bundled React SPA
- **Auth**: Supabase SSR with Bun cookie API
- **Database**: Same (Drizzle + PostgreSQL)
- **AI**: Same (Vercel AI SDK)

---

## Architecture Comparison

```
Next.js App Router                    Bun Server
─────────────────                     ──────────
src/app/                              src/
├── (auth)/                           ├── server/
│   ├── layout.tsx                    │   ├── index.ts          # Main server entry
│   ├── login/page.tsx                │   ├── routes/
│   └── auth/callback/route.ts        │   │   ├── api.ts         # API route handlers
├── (chat)/                           │   │   └── auth.ts        # Auth route handlers
│   ├── layout.tsx                    │   ├── middleware/
│   ├── page.tsx                      │   │   └── auth.ts        # Auth middleware
│   └── chat/[id]/page.tsx            │   └── lib/
├── api/                              │       └── supabase.ts    # Supabase client for Bun
│   ├── chat/route.ts                 ├── client/
│   └── chats/                        │   ├── index.html         # SPA entry point
│       └── [id]/messages/route.ts    │   ├── main.tsx           # React entry
└── layout.tsx                        │   └── App.tsx            # Router/App component
                                      └── shared/                # Shared types/utils
```

---

## Migration Steps

### 1. Project Structure

Create new structure alongside existing:

```bash
mkdir -p src/server/routes src/server/middleware src/server/lib src/client
```

### 2. Server Entry Point

**File: `src/server/index.ts`**

```typescript
import { serve } from "bun";
import index from "../client/index.html";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";

const server = serve({
  port: process.env.PORT ?? 3000,

  routes: {
    // Frontend SPA routes - HTML import bundles React app
    "/": index,
    "/login": index,
    "/chat/*": index,

    // Auth routes
    "/auth/callback": authRoutes.callback,

    // API routes
    "/api/chats": apiRoutes.chats,
    "/api/chats/:id/messages": apiRoutes.chatMessages,
    "/api/chat": apiRoutes.chat,
  },

  // Fallback for unmatched routes
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
```

### 3. API Route Migration

#### Current (Next.js)

```typescript
// src/app/api/chats/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const chats = await getUserChats(userId);
  return NextResponse.json(chats);
}

export async function POST(req: Request) {
  // ...
}
```

#### Migrated (Bun)

```typescript
// src/server/routes/api.ts
import { getCurrentUserId } from "../lib/supabase";
import {
  getUserChats,
  createChat,
  deleteChat,
  getChat,
} from "@/lib/chat-store";

export const apiRoutes = {
  chats: {
    async GET(req: Request) {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const chats = await getUserChats(userId);
      return Response.json(chats);
    },

    async POST(req: Request) {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { id, title } = await req.json();
      if (!id) {
        return Response.json({ error: "id is required" }, { status: 400 });
      }
      const chatId = await createChat(userId, title, id);
      return Response.json({ id: chatId });
    },

    async DELETE(req: Request) {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = new URL(req.url);
      const chatId = url.searchParams.get("id");
      if (!chatId) {
        return Response.json({ error: "id is required" }, { status: 400 });
      }
      // Verify ownership...
      await deleteChat(chatId);
      return Response.json({ success: true });
    },
  },

  // Dynamic route: /api/chats/:id/messages
  chatMessages: {
    async GET(req: Request & { params: { id: string } }) {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { id } = req.params;
      const chat = await getChat(id);
      if (!chat || chat.userId !== userId) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      const messages = await loadChatMessages(id);
      return Response.json(messages);
    },
  },

  // Streaming chat endpoint
  chat: {
    async POST(req: Request) {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return new Response("Unauthorized", { status: 401 });
      }
      // ... existing chat logic (mostly unchanged)
      // Return streaming response
    },
  },
};
```

### 4. Supabase Auth Migration

#### Current (Next.js with cookies from next/headers)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        /* ... */
      },
    },
  });
}
```

#### Migrated (Bun with BunRequest cookies)

```typescript
// src/server/lib/supabase.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

/**
 * Creates Supabase client for Bun server requests.
 * Uses BunRequest cookies API for session management.
 */
export const createClient = (req: Request) => {
  // BunRequest has .cookies property when using routes
  const bunReq = req as Request & { cookies: Map<string, string> };

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookies: Array<{ name: string; value: string }> = [];
        // Bun's CookieMap is iterable
        for (const [name, value] of bunReq.cookies.entries()) {
          cookies.push({ name, value });
        }
        return cookies;
      },
      setAll(cookiesToSet) {
        // Cookies set via req.cookies.set() are auto-applied to response
        for (const { name, value, options } of cookiesToSet) {
          bunReq.cookies.set(name, value, {
            path: options?.path ?? "/",
            maxAge: options?.maxAge,
            httpOnly: options?.httpOnly,
            secure: options?.secure,
            sameSite: options?.sameSite as "strict" | "lax" | "none",
          });
        }
      },
    },
  });
};

/**
 * Gets current user ID from Supabase auth
 */
export const getCurrentUserId = async (
  req: Request
): Promise<string | null> => {
  const supabase = createClient(req);
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub || typeof data.claims.sub !== "string") {
    return null;
  }
  return data.claims.sub;
};
```

### 5. Auth Callback Route

#### Current (Next.js)

```typescript
// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // ...
  return NextResponse.redirect(`${origin}${next}`);
};
```

#### Migrated (Bun)

```typescript
// src/server/routes/auth.ts
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase";

export const authRoutes = {
  callback: async (req: Request) => {
    const url = new URL(req.url);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;
    const next = url.searchParams.get("next") ?? "/";
    const origin = url.origin;

    if (!tokenHash || !type) {
      return Response.redirect(
        `${origin}/login?error=missing_verification_params`
      );
    }

    const supabase = createClient(req);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return Response.redirect(`${origin}/login?error=unable_to_verify_token`);
    }

    return Response.redirect(`${origin}${next}`);
  },
};
```

### 6. Frontend SPA Setup

#### HTML Entry Point

```html
<!-- src/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mark Life AI</title>
    <link rel="stylesheet" href="./styles/globals.css" />
    <link rel="icon" href="./favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

#### React Entry

```tsx
// src/client/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
```

#### Client-Side Router

```tsx
// src/client/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Router } from "./Router";

const queryClient = new QueryClient();

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router />
    </ThemeProvider>
  </QueryClientProvider>
);
```

```tsx
// src/client/Router.tsx
import { useEffect, useState } from "react";
import { LoginPage } from "./pages/Login";
import { ChatLayout } from "./pages/ChatLayout";

/**
 * Simple client-side router based on pathname
 */
export const Router = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Auth routes
  if (pathname === "/login") {
    return <LoginPage />;
  }

  // Chat routes (protected)
  if (pathname === "/" || pathname.startsWith("/chat")) {
    return <ChatLayout />;
  }

  return <div>404 Not Found</div>;
};

/**
 * Programmatic navigation helper
 */
export const navigate = (to: string) => {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
```

### 7. Server Actions Migration

Server Actions (`"use server"`) don't exist in Bun. Convert to API endpoints:

#### Current (Next.js Server Action)

```typescript
// src/lib/supabase/auth/actions.ts
"use server";

export const signInWithMagicLink = async (email: string) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  return error ? { success: false, error: error.message } : { success: true };
};
```

#### Migrated (Bun API endpoint + client fetch)

```typescript
// src/server/routes/auth.ts
export const authRoutes = {
  // ...existing callback

  magicLink: {
    async POST(req: Request) {
      const { email } = await req.json();
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const supabase = createClient(req);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${appUrl}/auth/callback` },
      });

      if (error) {
        return Response.json({ success: false, error: error.message });
      }
      return Response.json({ success: true });
    },
  },
};
```

```typescript
// src/client/lib/auth.ts
export const signInWithMagicLink = async (email: string) => {
  const res = await fetch("/api/auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
};
```

---

## Key Differences

| Feature            | Next.js                       | Bun Server                         |
| ------------------ | ----------------------------- | ---------------------------------- |
| **Routing**        | File-based (`app/`)           | Object-based in `Bun.serve()`      |
| **API Routes**     | `route.ts` exports            | Handler objects with HTTP methods  |
| **Dynamic Params** | `[id]` folder                 | `:id` in route string              |
| **Cookies**        | `cookies()` from next/headers | `req.cookies` (BunRequest)         |
| **Server Actions** | `"use server"` functions      | Regular API endpoints              |
| **SSR**            | Built-in                      | Not built-in (SPA approach)        |
| **Hot Reload**     | Built-in                      | `bun --hot` or `development: true` |
| **Static Assets**  | `public/` folder              | HTML imports + bundler             |

---

## Build & Deploy

### Development

```bash
bun --hot src/server/index.ts
```

### Production Build

```bash
# Bundle frontend + server for production
bun build --target=bun --production --outdir=dist src/server/index.ts
```

### Run Production

```bash
NODE_ENV=production bun dist/index.js
```

---

## Migration Checklist

### Phase 1: Setup

- [x] Create `src/server/` structure
- [x] Create `src/client/` structure
- [x] Move `globals.css` and static assets to `src/client/`
- [x] Create `index.html` entry point

### Phase 2: Server

- [x] Migrate Supabase client to use Bun cookies
- [x] Create auth routes (`/auth/callback`, `/api/auth/magic-link`)
- [x] Create API routes (`/api/chats`, `/api/chats/:id/messages`, `/api/chat`)
- [x] Set up main server entry (`src/server/index.ts`)

### Phase 3: Frontend

- [x] Create React entry point (`main.tsx`)
- [x] Create client-side router
- [x] Move page components to `src/client/pages/`
- [x] Convert server actions to fetch calls
- [x] Update imports for new structure

### Phase 4: Testing & Cleanup

- [ ] Test auth flow (login → callback → session)
- [ ] Test chat functionality
- [ ] Test streaming responses
- [ ] Remove Next.js specific files
- [ ] Update `package.json` scripts

### Phase 5: Production

- [ ] Configure production build
- [ ] Set up environment variables
- [ ] Deploy and verify

---

## Environment Variables

Update from Next.js prefixes:

```bash
# Before (Next.js)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...

# After (Bun)
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
APP_URL=http://localhost:3000  # or production URL
```

For client-side env vars, use `bunfig.toml`:

```toml
[serve.static]
env = "PUBLIC_*"  # Only inline vars starting with PUBLIC_
```

---

## Dependencies to Remove

After migration, these Next.js specific packages can be removed:

```bash
bun remove next next-themes
```

Note: `next-themes` needs replacement. Consider:

- Manual theme toggle with CSS variables
- Or a Bun-compatible alternative

---

## Notes

1. **No SSR**: Bun server approach is SPA-first. If SSR is needed, consider keeping Next.js or implementing custom SSR.

2. **Streaming**: AI SDK streaming works the same - return `createUIMessageStreamResponse()` from handlers.

3. **File Uploads**: Continue using current approach with Supabase storage.

4. **WebSockets**: Bun has built-in WebSocket support if needed for real-time features.
