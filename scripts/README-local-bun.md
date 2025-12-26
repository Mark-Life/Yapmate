# Using Local Bun Build

This allows you to test your local Bun changes (from `/Users/andrey/Code/public/bun`) in your app.

## Quick Start

```bash
# Build with your local Bun (tests your fix)
bun run build:local

# Or run dev server with local Bun
bun run dev:local

# Or start production server with local Bun
bun run start:local
```

## Direct Usage

You can also use the script directly:

```bash
# Run any command with local Bun
bun scripts/use-local-bun.ts build
bun scripts/use-local-bun.ts --filter '@yapmate/web' dev

# Or use the shell script
./scripts/use-local-bun.sh build
```

## Environment Variable

If your Bun repo is in a different location, set `BUN_REPO_PATH`:

```bash
BUN_REPO_PATH=/path/to/bun bun scripts/use-local-bun.ts build
```

## Verify It's Working

The script will print:
```
🔧 Using local Bun build: /Users/andrey/Code/public/bun/build/debug/bun-debug
```

If the local build isn't found, it falls back to system Bun with a warning.

## Testing Your Fix

1. Make sure your Bun is built:
   ```bash
   cd /Users/andrey/Code/public/bun
   export PATH="$(brew --prefix llvm@19)/bin:$PATH"
   bun run build
   ```

2. Build your app with local Bun:
   ```bash
   cd /Users/andrey/Code/personal/ai-app
   bun run build:local
   ```

3. Check the entry file:
   ```bash
   # Should be > 200 bytes (not empty!)
   ls -lh apps/web/dist/client/*.js | grep entry
   cat apps/web/dist/client/index-*.js | head -20
   ```

The entry file should contain actual code, not just sourcemap comments!

