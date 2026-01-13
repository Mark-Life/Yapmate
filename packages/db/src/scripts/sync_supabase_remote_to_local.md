# Database Sync Scripts

Scripts for managing local Supabase development environment.

## Prerequisites

1. Supabace CLI is installed https://supabase.com/docs/guides/local-development/cli/getting-started
2. Postgres is installed: `brew install postgresql@17`
3. Docker is installed and running https://docs.docker.com/desktop
4. **Environment variables**: Ensure `DATABASE_URL` is set in root `.env.local` file

## Quick Start

### First Time Setup

1. Initialize Supabase CLI (if not already done):

   ```bash
   cd packages/db
   supabase init
   ```

2. Start local Supabase and sync remote database:
   ```bash
   bun run supabase:setup
   ```

This will:

- Start local Supabase instance
- Download and sync remote development database to local

### Daily Usage

**Start local Supabase:**

```bash
bun run supabase:start
```

**Stop local Supabase:**

```bash
bun run supabase:stop
```

**Check Supabase status:**

```bash
bun run supabase:status
```

**Sync remote database to local:**

```bash
bun run supabase:sync
```

## How It Works

The sync script (`sync_supabase_remote_to_local.sh`):

1. **Validates** local Supabase is running
2. **Drops** all user-defined schemas (preserves Supabase system schemas)
3. **Exports** remote database using `pg_dump`
4. **Cleans** SQL dump (removes superuser-only operations)
5. **Imports** cleaned SQL into local Supabase
6. **Cleans up** temporary files

## Environment Variables

The script reads `DATABASE_URL` from the root `.env` file. This should be your remote development database connection string.

Example:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?workaround=supabase-pooler.vercel
```

## Local Supabase Configuration

Default local Supabase settings (Supabase CLI):

- **Host**: `localhost`
- **Port**: `54322`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `postgres`

These are automatically configured by Supabase CLI and don't need to be changed.

## Switching Between Local and Remote

### Use Local Database

1. Start local Supabase: `bun run supabase:start`
2. Update `.env.local` with local connection string:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
   ```

### Use Remote Database

Update `.env.local` with remote connection string:

```env
DATABASE_URL=postgresql://user:password@remote-host:5432/dbname?workaround=supabase-pooler.vercel
```

## Troubleshooting

**Error: Cannot connect to local Supabase**

- Make sure Supabase CLI is running: `bun run supabase:start`
- Check if port 54322 is available

**Error: DATABASE_URL not set**

- Ensure `.env.local` file exists in project root
- Verify `DATABASE_URL` is set in `.env.local`

**Error: Failed to export remote database**

- Check your `DATABASE_URL` connection string
- Verify you have network access to remote database
- Ensure remote database is accessible

**Some SQL statements failed during import**

- This is often normal - some statements may fail if they reference objects that don't exist locally
- Check the output for specific errors
- Most schema and data should import successfully

## Notes

- The script preserves Supabase system schemas (`auth`, `storage`, `vault`, etc.)
- Only user-defined schemas are dropped before sync
- Temporary SQL files are automatically cleaned up
- The script is idempotent - safe to run multiple times

---

# Step by step implementation guide

1. Install Supabace CLI: https://supabase.com/docs/guides/local-development/cli/getting-started
2. Install Postgres: `brew install postgresql@17`
3. Install Docker, start the app and login (cau ise GitHub SSO) https://docs.docker.com/desktop
   > note: the Docker app should be running whenever you want to use local db
4. Ensure `DATABASE_URL` in root's `.env` file has remote `dev` database connection string.
5. Open the terminal in the `packages/db`: `cd packages/db`
6. Run `bun run supabase:setup` – this script setup local database, and then populate local database with the dump of the remove database that your `.env` file point to
7. !IMPORTANT! change `DATABASE_URL` in root's `.env` file to be your local db connection string: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, comment out DATABASE_URL that point to the remote db
8. Run `bun migrate` to apply latest migrations to the db
9. Now you can use local db instance. to see data, you can open `packages/db/drizzle.config.ts` file, and if you have "rphlmr.vscode-drizzle-orm" VSCode extension, you will have a button to open Drizzle studio, or just run `bun studio` command
10. to stop local db from running use `bun supabase:stop` command
