# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yapmate - AI chat application with web and mobile clients. Bun monorepo with shared packages.

## Commands

```bash
# Development
bun run dev              # Start web dev server (HMR enabled)
bun run build            # Build web app for production
bun run start            # Start production server

# Code Quality
bun run lint             # Biome check
bun run typecheck        # TypeScript type checking (tsc -b)
bun run format           # Biome format

# Database (Drizzle)
bun run db:generate      # Generate migrations from schema changes
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
bun run db:pull          # Pull schema from database

# Mobile (from apps/mobile/)
cd apps/mobile && bun run dev
```

## Architecture

### Monorepo Structure

```
apps/
  web/           # Bun + Vite fullstack (React 19)
  mobile/        # Expo React Native
packages/
  api/           # oRPC type-safe API (routers, schemas, middleware)
  components/    # Shared React UI (shadcn/ui style)
  core/          # Shared types and utilities
  db/            # Drizzle ORM schema and services
  server/        # Server logic, AI integrations, routes
```

### Web App Server (`apps/web/src/server/index.ts`)

Single Bun server entry point handling:
- **Frontend SPA**: Vite-bundled React app with HMR in dev
- **oRPC routes**: `/rpc/*` - type-safe procedures
- **HTTP routes**: `/api/*` - streaming (SSE), file uploads
- **WebSocket**: `/ws` - real-time presence, typing indicators
- **Static pages**: `/about`, `/help`, `/terms`, `/policy`

### API Layer

oRPC for type-safe APIs. Client created via `@yapmate/api/client`, router via `@yapmate/api/router`.

Routers in `packages/api/src/routers/`: auth, chats, messages, models, members, settings, mcp, etc.

Keep streaming endpoints (SSE) and file uploads as HTTP routes - don't migrate to oRPC.

### Database

Drizzle ORM with PostgreSQL. Schema in `packages/db/src/schema/`, services in `packages/db/src/service/`.

### Path Aliases

Defined in root `tsconfig.json`:
- `@yapmate/db`, `@yapmate/db/schema`, `@yapmate/db/service`
- `@yapmate/components/ui/*`, `@yapmate/components/hooks/*`
- `@yapmate/server`, `@yapmate/server/routes/*`, `@yapmate/server/lib/*`
- `@yapmate/core/types`, `@yapmate/core/ai`
- `@yapmate/api/client`, `@yapmate/api/router`

## Code Style

Uses Biome via Ultracite preset. Config in `biome.json`.

- 2-space indent
- Prefer `interface` over `type` for object shapes
- Use `for...of` over `.forEach()`
- Arrow functions for callbacks
- `const` by default, `let` when needed, never `var`

## Key Dependencies

- **Runtime**: Bun
- **AI**: Vercel AI SDK (`ai` package)
- **API**: oRPC (`@orpc/server`, `@orpc/client`)
- **Database**: Drizzle ORM, PostgreSQL (`postgres`)
- **Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **UI**: React 19, Tailwind CSS 4, Radix UI
- **Validation**: Zod 4
- **Functional**: Effect (`effect`, `@effect/platform`)

<!-- effect-solutions:start -->
## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `.reference/effect/` for real implementations (run `effect-solutions setup` first)

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.
<!-- effect-solutions:end -->
