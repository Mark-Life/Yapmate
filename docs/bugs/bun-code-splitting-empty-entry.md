# Bun Bug Report: Code Splitting with HTML Entry Creates Empty Entry JS File

## Summary

When using `Bun.build()` with `splitting: true` and an HTML file as the entry point, the bundler produces an empty JavaScript entry file. This causes `Bun.serve()` to throw a `TypeError` when the HTML import is used in routes.

## Environment

- **Bun version**: 1.3.2 (macOS arm64)
- **OS**: macOS (darwin 25.1.0)
- **Date**: December 24, 2025

## The Problem

### Expected Behavior

When building with code splitting enabled:
1. HTML entry point should reference a JS entry file
2. JS entry file should contain imports to code-split chunks
3. Chunks should contain the actual application code
4. `Bun.serve()` should be able to serve the HTML bundle

### Actual Behavior

1. HTML entry point references a JS entry file (e.g., `index-a2cyg4k4.js`)
2. **JS entry file is EMPTY** (only contains sourcemap comments, ~89 bytes)
3. Application code IS in the chunks (e.g., `index-mzdx29dm.js` contains React code)
4. `Bun.serve()` throws `TypeError: 'routes' expects a Record<string, Response | HTMLBundle | ...>`

## Reproduction Steps

### Minimal Build Configuration

```typescript
// build.ts
await Bun.build({
  entrypoints: ["./src/client/index.html"],
  outdir: "./dist/client",
  target: "browser",
  format: "esm",
  splitting: true,  // <-- THIS CAUSES THE BUG
  minify: true,
  sourcemap: "linked",
});
```

### Source HTML

```html
<!-- src/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

### Source Entry Point

```tsx
// src/client/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./layout";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
```

### Build Output (with splitting: true)

```
dist/client/
├── index-vjxc50wy.html     # HTML with <script src="./index-a2cyg4k4.js">
├── index-a2cyg4k4.js       # EMPTY! Only 89 bytes (sourcemap comments only)
├── index-a2cyg4k4.js.map   # Sourcemap
├── index-mzdx29dm.js       # 1.4 MB - Contains React and app code!
├── index-tfwajd4t.js       # Chunk with more code
├── ... (hundreds of other chunks)
```

### Contents of Empty Entry File

```javascript
// dist/client/index-a2cyg4k4.js (89 bytes)

//# debugId=AB071BD874FD274B64756E2164756E21
//# sourceMappingURL=index-a2cyg4k4.js.map
```

**The file is empty - no imports, no code, just sourcemap reference!**

### Server Error

```typescript
// src/server/index.ts
import index from "../client/index.html";

Bun.serve({
  routes: {
    "/": index,  // <-- TypeError here
  },
});
```

Error:
```
TypeError: 'routes' expects a Record<string, Response | HTMLBundle | {[method: string]: (req: BunRequest) => Response|Promise<Response>}>
```

## Analysis

### What Works

1. **Without code splitting** (`splitting: false`):
   - Single 13-14 MB JS bundle is created
   - Entry file contains all code
   - `Bun.serve()` works correctly
   - HTML import returns valid `HTMLBundle`

2. **The chunks ARE generated correctly**:
   - `index-mzdx29dm.js` (1.4 MB) contains React, react-dom
   - Other chunks contain app components
   - Code splitting IS happening

### What's Broken

1. **Entry file is empty**:
   - The file that HTML references has no code
   - No `import` statements to pull in chunks
   - Only sourcemap metadata

2. **HTMLBundle is corrupted**:
   - When Bun processes the HTML import at build time
   - The resulting bundle object is invalid
   - Causes `Bun.serve()` to reject it

## Theories

### Theory 1: Entry Point Naming Collision

The HTML file is named `index.html` and the bundler names the JS entry as `index-[hash].js`. 
With code splitting, the bundler might be confusing the HTML entry with the JS entry.

**Evidence**: All chunk files are also named `index-*.js` which suggests naming normalization issue.

### Theory 2: HTMLBundle Generation Bug

When `splitting: true`, the `HTMLBundle` object that Bun creates from the HTML import 
might not correctly reference the entry point, or the entry point path is wrong.

**Evidence**: The error occurs at runtime when `Bun.serve()` validates the routes.

### Theory 3: Tree Shaking Too Aggressive

The bundler might be tree-shaking the entry point because it thinks all code 
is already in chunks, not realizing the entry needs to import those chunks.

**Evidence**: The entry file is completely empty, not just missing some code.

### Theory 4: Code Splitting + HTML Entry Not Supported

The combination of HTML entry points + code splitting might not be a tested/supported configuration.

**Evidence**: Bun docs show HTML imports working, and code splitting working, but not together in the same example.

## Attempted Fixes

### Fix 1: Two-Phase Build (Partial Success)

Build client separately, serve pre-built HTML file instead of HTML import.

```typescript
// Build
await Bun.build({
  entrypoints: ["./src/client/index.html"],
  outdir: "./dist/client",
  splitting: true,
});

// Server
const indexHtml = Bun.file("./client/index.html");
Bun.serve({
  routes: { "/": indexHtml },
});
```

**Result**: HTML is served but JS entry file is still empty, app doesn't load.

### Fix 2: Different Naming Config

Tried `entry: "[name].[ext]"` to avoid hash in entry filename.

**Result**: No change, entry file still empty.

### Fix 3: Exclude HTML from Server Build

Used a Bun plugin to replace HTML import with `null` in production server bundle.

```typescript
const excludeHtmlPlugin = {
  name: "exclude-html",
  setup(build) {
    build.onResolve({ filter: /\.html$/ }, (args) => ({
      path: args.path,
      namespace: "html-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "html-stub" }, () => ({
      contents: "export default null;",
      loader: "js",
    }));
  },
};
```

**Result**: Server bundle smaller, but client entry file still empty.

## Files to Investigate in Bun Source Code

Based on the symptoms, these are the likely areas to investigate:

1. **HTML Bundler** - How HTML entries are processed
   - Look for HTML entry point handling
   - How `<script>` tags are resolved and bundled

2. **Code Splitting Logic** - Entry point generation
   - How entry points are generated with splitting enabled
   - Why entry file might be empty

3. **HTMLBundle Type** - What makes a valid bundle
   - Structure of `HTMLBundle` object
   - Validation in `Bun.serve()`

4. **Naming/Path Resolution** - Entry file references
   - How HTML references to JS entries are resolved
   - Why chunks have correct code but entry is empty

## Bun Source Code Locations (Likely)

The Bun bundler is written in Zig. Key areas:

- `src/bundler/` - Bundler core logic
- `src/js_printer.zig` - JavaScript output generation
- `src/linker.zig` - Module linking and code splitting
- `src/html_parser.zig` or similar - HTML processing

## Workarounds (Not Ideal)

1. **Disable code splitting** - Single 14MB bundle (current fallback)
2. **Use Vite for client** - Separate client bundler with working code splitting
3. **Manual chunk imports** - Modify HTML to manually import all necessary chunks

## Next Steps

1. Clone Bun source code
2. Add debug logging to entry point generation with splitting enabled
3. Compare entry generation with/without splitting
4. Find where the entry file content is being lost
5. Create a fix and submit PR to Bun

## Related Links

- Bun bundler docs: https://bun.sh/docs/bundler
- Bun fullstack docs: https://bun.sh/docs/bundler/fullstack
- Bun GitHub: https://github.com/oven-sh/bun

## Current Codebase State

The codebase is set up to reproduce and investigate this bug:

- `apps/web/build.ts` - Two-phase build with code splitting ENABLED
- `apps/web/src/server/index.ts` - Server configured for two-phase build
- `docs/bugs/bun-code-splitting-empty-entry.md` - This file

## Test Commands

```bash
# Build with splitting (reproduces bug)
cd apps/web
bun --bun --env-file ../../.env build.ts

# Check entry file (should be empty - THE BUG)
cat dist/client/index-*.js | head -5

# Check for React in chunks (should exist - code IS split)
grep -l "createRoot" dist/client/*.js

# Start server (will serve HTML but app won't load due to empty entry)
bun run start

# Verify HTML references the empty entry file
cat dist/client/index.html | grep script
```

## Bun Source Code Investigation

The Bun source code is in the workspace at `/Users/andrey/Code/public/bun/`.

Key files to investigate:
- `src/bundler/bundle_v2.zig` - Main bundler logic
- `src/bundler/linker.zig` - Module linking and code splitting
- `src/js_printer.zig` - JavaScript output generation

