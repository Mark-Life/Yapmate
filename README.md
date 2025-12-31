# Yapmate

AI chat application with web and mobile clients. Built as a monorepo with shared packages for type-safe APIs, database access, and UI components.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Web**: Vite + Bun fullstack
- **Mobile**: Expo React Native
- **Backend**: Bun HTTP server with oRPC for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase
- **AI**: Vercel AI SDK
- **Code Quality**: Biome (linting & formatting)

## Project Structure

```
yapmate/
├── apps/
│   ├── web/          # Web application (Bun + Vite)
│   └── mobile/       # Mobile application (Expo React Native)
├── packages/
│   ├── api/          # Type-safe API layer (oRPC)
│   ├── components/   # Shared UI components
│   ├── core/         # Shared types and utilities
│   ├── db/           # Database schema and migrations (Drizzle)
│   └── server/       # Server-side logic and AI integrations
└── docs/             # Documentation
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest version)
- PostgreSQL database
- Supabase project (for authentication)

### Installation

```bash
# Install dependencies
bun install
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI Providers (OpenRouter, Groq, etc.)
OPENROUTER_API_KEY=...
GROQ_API_KEY=...

# Redis (optional, for WebSocket scaling)
REDIS_URL=...
```

### Development

```bash
# Start web app
bun run dev

# Start mobile app
cd apps/mobile
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

### Database

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio

# Pull schema from database
bun run db:pull
```

## Scripts

- `dev` - Start web development server
- `build` - Build web app for production
- `start` - Start production server
- `lint` - Run Biome linter
- `typecheck` - Run TypeScript type checking
- `format` - Format code with Biome
- `db:*` - Database management commands

## Deployment

Deployed on Railway. Configuration in `railway.toml`.

## Architecture

### API Layer

Type-safe APIs using oRPC. See `packages/api/README.md` for route documentation.

- **oRPC routes**: `/rpc/*` - Type-safe procedures for CRUD operations
- **HTTP routes**: `/api/*` - Streaming endpoints and file uploads

### Database

Drizzle ORM with PostgreSQL. Schema definitions in `packages/db/src/schema/`.

### Shared Packages

- `@yapmate/api` - Type-safe API client and server router
- `@yapmate/components` - Shared React components
- `@yapmate/core` - Shared types and utilities
- `@yapmate/db` - Database schema and services
- `@yapmate/server` - Server-side logic and AI model integrations

## License

Private project.
