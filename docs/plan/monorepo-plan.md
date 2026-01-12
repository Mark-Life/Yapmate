# Yapmate Monorepo Migration Plan

## Overview

This document outlines the step-by-step plan to migrate the current Yapmate codebase into a monorepo structure supporting:

- **Web app** (current Bun fullstack)
- **Desktop app** (Tauri)
- **Mobile app** (Expo React Native)
- **Type-safe API** (oRPC with OpenAPI)

---

## Target Architecture

```
yapmate/
├── apps/
│   ├── web/                    # Bun fullstack entry point
│   │   ├── public/             # Static assets, PWA files
│   │   ├── src/
│   │   └── build.ts
│   ├── desktop/                # Tauri shell (wraps web frontend)
│   └── mobile/                 # Expo React Native app
├── packages/
│   ├── api/                    # oRPC router + procedures (type-safe API contract)
│   ├── server/                 # Bun server handlers, middleware, AI SDK
│   ├── db/                     # Drizzle schema, migrations, queries
│   ├── ui/                     # shadcn/ui components (web + desktop)
│   ├── ui-native/              # React Native components (mobile only)
│   └── core/                   # Shared business logic, types, utils
├── biome.json
├── bun.lock
├── package.json                # Workspace root
├── tsconfig.json               # Base TypeScript config
└── drizzle.config.ts
```

---

## Phase 1: Restructure Current Codebase

**Goal**: Move existing code into monorepo structure without breaking functionality.

### 1.1 Create Directory Structure

- [x] Create `apps/` directory
- [x] Create `apps/web/` directory
- [x] Create `packages/` directory
- [x] Create `packages/db/` directory
- [x] Create `packages/ui/` directory
- [x] Create `packages/server/` directory
- [x] Create `packages/core/` directory

### 1.2 Move Database Package (`packages/db`)

- [x] Move `src/server/lib/db/` → `packages/db/src/`
- [x] Create `packages/db/package.json`:
  ```json
  {
    "name": "@yapmate/db",
    "type": "module",
    "exports": {
      ".": "./src/index.ts",
      "./schema": "./src/schema/index.ts"
    }
  }
  ```
- [x] Move `drizzle.config.ts` to reference new paths
- [x] Update all imports from `@/server/lib/db` → `@yapmate/db`

### 1.3 Move UI Package (`packages/ui`)

- [x] Move `src/client/components/ui/` → `packages/ui/src/`
- [x] Create `packages/ui/package.json`:
  ```json
  {
    "name": "@yapmate/components",
    "type": "module",
    "exports": {
      "./*": "./src/*.tsx"
    },
    "peerDependencies": {
      "react": "^19",
      "react-dom": "^19"
    }
  }
  ```
- [x] Move `src/client/lib/utils.ts` → `packages/ui/src/lib/utils.ts`
- [x] Update all imports from `@yapmate/components/ui` → `@yapmate/components/ui`
- [x] Move `components.json` to reference new paths

### 1.4 Move Server Package (`packages/server`)

- [x] Move `src/server/lib/` (except db) → `packages/server/src/lib/`
- [x] Move `src/server/middleware/` → `packages/server/src/middleware/`
- [x] Move `src/server/routes/` → `packages/server/src/routes/`
- [x] Create `packages/server/package.json`:
  ```json
  {
    "name": "@yapmate/server",
    "type": "module",
    "exports": {
      ".": "./src/index.ts",
      "./routes/*": "./src/routes/*.ts",
      "./middleware/*": "./src/middleware/*.ts"
    }
  }
  ```
- [x] Update all imports

### 1.5 Create Core Package (`packages/core`)

- [x] Create `packages/core/src/types/` for shared types
- [x] Move shared types from server/client to core
- [x] Create `packages/core/package.json`:
  ```json
  {
    "name": "@yapmate/core",
    "type": "module",
    "exports": {
      ".": "./src/index.ts",
      "./types": "./src/types/index.ts"
    }
  }
  ```

### 1.6 Create Web App (`apps/web`)

- [x] Move `src/client/` → `apps/web/src/client/`
- [x] Move `src/server/index.ts` → `apps/web/src/server/index.ts`
- [x] Create `apps/web/package.json`:
  ```json
  {
    "name": "@yapmate/web",
    "type": "module",
    "scripts": {
      "dev": "bun --bun --hot src/server/index.ts",
      "build": "bun --bun build.ts",
      "start": "cd dist && bun --bun index.js"
    },
    "dependencies": {
      "@yapmate/db": "workspace:*",
      "@yapmate/components": "workspace:*",
      "@yapmate/server": "workspace:*",
      "@yapmate/core": "workspace:*"
    }
  }
  ```
- [x] Move `build.ts` → `apps/web/build.ts`
- [x] Move `public/` → `apps/web/public/` (static assets, PWA files)
- [x] Update all imports to use workspace packages

### 1.7 Update Root Configuration

- [x] Update root `package.json` with workspaces:
  ```json
  {
    "name": "yapmate",
    "private": true,
    "workspaces": ["apps/*", "packages/*"],
    "scripts": {
      "dev": "bun --filter '@yapmate/web' dev",
      "build": "bun --filter '@yapmate/web' build",
      "lint": "biome check",
      "typecheck": "tsc -b"
    }
  }
  ```
- [x] Update `tsconfig.json` with path aliases for all packages
- [x] Update `biome.json` if needed for new structure
- [x] Update `.gitignore` for new paths

### 1.8 Verify Phase 1

- [x] Run `bun install` from root
- [x] Run `bun run dev` and verify app starts
- [x] Run `bun run build` and verify build succeeds
- [x] Run `bun run typecheck` and fix any type errors
- [x] Run `bun run lint` and fix any lint errors
- [x] Manual test: login, create chat, send message, view history

---

## Phase 2: Update Deployment

**Goal**: Ensure Railway deployment works with new structure.

### 2.1 Update Railway Configuration

- [x] Update `railway.toml` build command to point to `apps/web`
- [x] Update start command for new paths
- [x] Verify environment variables still work

### 2.2 Update Drizzle Config

- [x] Update `drizzle.config.ts` paths for new db package location
- [x] Test `bun run db:generate`
- [x] Test `bun run db:migrate`

### 2.3 Deploy and Verify

- [x] Push to Railway
- [x] Verify deployment succeeds
- [x] Test all functionality in production:
  - [x] Authentication (magic link)
  - [x] Chat creation
  - [x] Message streaming
  - [x] Model switching
  - [x] Chat history

---

## Phase 3: Add oRPC (Type-Safe API)

**Goal**: Replace fetch calls with type-safe oRPC procedures.

### 3.1 Create API Package (`packages/api`)

- [x] Create `packages/api/` directory
- [x] Install oRPC dependencies:
  ```bash
  bun add @orpc/server @orpc/client zod
  ```
- [x] Create `packages/api/package.json`:
  ```json
  {
    "name": "@yapmate/api",
    "type": "module",
    "exports": {
      ".": "./src/index.ts",
      "./client": "./src/client.ts",
      "./router": "./src/router.ts"
    }
  }
  ```

### 3.2 Define oRPC Router

- [x] Create `packages/api/src/router.ts` with all procedures
- [x] Define Zod schemas for all request/response types

### 3.3 Create oRPC Server Handler

- [x] Create server-side handler that mounts router
- [x] Integrate with existing Bun.serve routes
- [x] Add context (user session, db) to procedures

### 3.4 Create oRPC Client

- [x] Create `packages/api/src/client.ts` with typed client
- [x] Export client factory for different platforms

### 3.5 Migrate Client Fetch Calls

- [x] Replace `fetch("/api/chats")` → `client.chats.list()`
- [x] Replace `fetch("/api/chats/${id}/messages")` → `client.messages.list({ chatId })`
- [x] Replace all other fetch calls
- [x] Remove manual type assertions

### 3.6 Verify Phase 3

- [x] All type errors resolved
- [x] All fetch calls replaced
- [x] Manual test all functionality
- [x] Deploy and verify production

---

## Phase 4: Add Desktop App (Tauri)

**Goal**: Create macOS desktop app wrapping the web frontend.

### 4.1 Setup Tauri

- [x] Install Tauri CLI: `bun add -D @tauri-apps/cli`
- [x] Initialize Tauri in `apps/desktop/`:
  ```bash
  cd apps/desktop && bunx tauri init
  ```
- [x] Configure `tauri.conf.json`:
  - App name, identifier, version
  - Window size, title
  - Dev server URL (localhost:3000)

### 4.2 Configure Build

- [x] Create `apps/desktop/package.json`
- [x] Configure build to use web frontend from `apps/web/dist`
- [x] Setup Tauri build scripts

### 4.3 Add Native Features

- [ ] Add notification plugin: `bunx tauri add notification`
- [ ] Configure notification permissions
- [ ] Add system tray (optional)
- [ ] Add auto-updater (optional)

### 4.4 Implement Notifications

- [ ] Create notification service in `@yapmate/core`
- [ ] Hook into chat completion event
- [ ] Trigger native notification when LLM response completes
- [ ] Handle notification click → open chat

### 4.5 Build and Test

- [ ] Run `bunx tauri dev` for development
- [ ] Run `bunx tauri build` for production build
- [ ] Test on macOS
- [ ] Test notifications
- [ ] Test offline behavior

### 4.6 Code Signing (for Distribution)

- [ ] Setup Apple Developer account
- [ ] Configure code signing in Tauri
- [ ] Build signed .dmg

---

## Phase 5: Add Mobile App (Expo)

**Goal**: Create React Native mobile app with shared business logic.

### 5.1 Setup Expo

- [ ] Create `apps/mobile/` with Expo:
  ```bash
  cd apps && bunx create-expo-app mobile --template blank-typescript
  ```
- [ ] Configure for monorepo (metro.config.js)

### 5.2 Create Native UI Package (`packages/ui-native`)

- [ ] Create `packages/ui-native/` directory
- [ ] Build React Native equivalents of key components:
  - [ ] Button, Input, Card
  - [ ] Chat message bubbles
  - [ ] Model selector
  - [ ] Chat list

### 5.3 Integrate oRPC Client

- [ ] Import `@yapmate/api/client` in mobile app
- [ ] Configure API base URL for production server
- [ ] Add authentication flow

### 5.4 Implement Core Screens

- [ ] Login screen
- [ ] Chat list screen
- [ ] Chat screen with messaging
- [ ] Settings screen

### 5.5 Add Push Notifications

- [ ] Configure Expo Push Notifications
- [ ] Setup notification tokens in database
- [ ] Trigger push on LLM completion (from server)

### 5.6 Build and Test

- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical devices
- [ ] Submit to TestFlight / Play Store internal testing

---

## Phase 6: Polish and Production

### 6.1 Offline Support (Web + Desktop)

- [ ] Enhance service worker for offline caching
- [ ] Add IndexedDB sync for messages
- [ ] Queue outgoing messages when offline
- [ ] Sync on reconnection

### 6.2 Cross-Platform Notifications

- [ ] Web: Web Push API via service worker
- [ ] Desktop: Tauri native notifications
- [ ] Mobile: Expo Push Notifications
- [ ] Server: Unified notification trigger on LLM completion

### 6.3 Shared Configuration

- [ ] Create `packages/config/` for shared configs
- [ ] Move biome, tsconfig base to shared package
- [ ] Standardize across all apps

### 6.4 CI/CD

- [ ] Setup GitHub Actions for:
  - [ ] Lint + typecheck on PR
  - [ ] Build all apps
  - [ ] Deploy web to Railway
  - [ ] Build desktop artifacts
  - [ ] Build mobile (EAS Build)

---

## Current Status

| Phase                | Status         | Notes                |
| -------------------- | -------------- | -------------------- |
| Phase 1: Restructure | 🔴 Not Started | —                    |
| Phase 2: Deployment  | 🔴 Not Started | Depends on Phase 1   |
| Phase 3: oRPC        | 🔴 Not Started | Depends on Phase 2   |
| Phase 4: Desktop     | 🔴 Not Started | Depends on Phase 3   |
| Phase 5: Mobile      | 🔴 Not Started | Depends on Phase 3   |
| Phase 6: Polish      | 🔴 Not Started | Depends on Phase 4+5 |

---

## Dependencies

### New Packages to Install

**Root (devDependencies)**:

```bash
# None initially - workspaces handled by Bun
```

**packages/api**:

```bash
bun add @orpc/server @orpc/client @orpc/openapi
```

**apps/desktop**:

```bash
bun add -D @tauri-apps/cli @tauri-apps/api
bunx tauri add notification
```

**apps/mobile**:

```bash
bunx create-expo-app mobile --template blank-typescript
cd apps/mobile && bun add expo-notifications expo-device
```

---

## Notes for LLM Agents

When working on this migration:

1. **Always check this file** for current status and what phase we're in
2. **Update status** after completing tasks (change 🔴 to 🟡 in progress, 🟢 done)
3. **Don't skip phases** - each phase depends on the previous
4. **Test thoroughly** before marking complete
5. **Keep imports clean** - use workspace package names (`@yapmate/components`) not relative paths
6. **Follow existing patterns** - look at current code style before making changes

---

## Quick Reference: Package Exports

```typescript
// @yapmate/db
import { db, schema } from "@yapmate/db";
import { chats, messages } from "@yapmate/db/schema";

// @yapmate/components
import { Button } from "@yapmate/components/button";
import { Card } from "@yapmate/components/card";

// @yapmate/server
import { chatHandler } from "@yapmate/server/routes/chat";

// @yapmate/api
import { appRouter, type AppRouter } from "@yapmate/api/router";
import { createClient } from "@yapmate/api/client";

// @yapmate/core
import { type Chat, type Message } from "@yapmate/core/types";
```
