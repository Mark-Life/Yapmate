# Bun Bug Report: HTML Entry Point with Code Splitting Produces Empty JS Entry File

## Summary

When using `Bun.build()` with an HTML file as entry point and `splitting: true`, the generated JavaScript entry file is empty (contains only sourcemap comments). The application code exists in other chunks but is never executed because the entry file doesn't import those chunks.

## Environment

- **Bun version**: 1.3.2+ (tested on 1.3.6)
- **OS**: macOS arm64 (darwin 25.1.0)
- **Build API**: `Bun.build()` with `splitting: true`

## Reproduction

### Minimal Configuration

```typescript
await Bun.build({
  entrypoints: ["./src/client/index.html"],
  outdir: "./dist/client",
  target: "browser",
  format: "esm",
  splitting: true,  // Required to trigger the bug
});
```

### Source Files

**index.html:**
```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**main.tsx:**
```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

### Build Output

```
dist/client/
├── index.html              # References index-a2cyg4k4.js
├── index-a2cyg4k4.js       # EMPTY! Only 89 bytes (sourcemap comments)
├── index-mzdx29dm.js       # 1.4 MB - Contains React + main.tsx code!
├── chunk-*.js              # Many other chunks with app code
```

### Empty Entry File Content

```javascript
// dist/client/index-a2cyg4k4.js (89 bytes)

//# debugId=AB071BD874FD274B64756E2164756E21
//# sourceMappingURL=index-a2cyg4k4.js.map
```

**Expected:** Entry file should contain imports to load chunks with app code
**Actual:** Entry file is empty, app never initializes

## Root Cause Analysis

### Investigation Findings

1. **HTML correctly references the entry JS file** - The HTML `<script>` tag points to the correct entry chunk

2. **App code IS bundled** - The `main.tsx` code (including `createRoot`, `getElementById`) exists in a separate chunk (`index-mzdx29dm.js`)

3. **Entry chunk has no files** - The entry chunk created for the HTML entry point contains no JavaScript files

4. **Side-effect imports not generated** - The entry chunk should import other chunks for side effects, but no imports are generated

### Technical Root Cause

The issue is in how chunks are assigned files with code splitting:

**In `computeChunks.zig`:**
- Entry chunk is created with `entry_bits = {0}` (only the HTML entry bit)
- Files are assigned to chunks based on **exact match** of `entry_bits`
- If `main.tsx` has `entry_bits = {0, 1, 2, ...}` (reachable from HTML AND dynamic imports), it does NOT match `{0}` exactly
- Result: Entry chunk has no files

**In `findAllImportedPartsInJSOrder.zig` (lines 92-97):**
```zig
var is_file_in_chunk = if (with_code_splitting ...)
    // EXACT equality required!
    v.entry_bits.eql(&v.c.graph.files.items(.entry_bits)[source_index])
else
    v.entry_bits.hasIntersection(...);
```

**In `computeCrossChunkDependencies.zig` (lines 254-266):**
The side-effect import logic should add imports for chunks containing code reachable from the entry point, but it's not working:
```zig
if (chunk.entry_point.is_entry_point) {
    for (chunks) |*other_chunk| {
        if (other_chunk.entry_bits.isSet(chunk.entry_point.entry_point_id)) {
            // Should add side-effect import here
            js.imports_from_other_chunks.getOrPutValue(...);
        }
    }
}
```

### Why Simple Tests Pass But Real Apps Fail

Simple test apps work because:
- Few or no dynamic imports → files only have single entry bit
- `main.tsx` has `entry_bits = {0}` → matches entry chunk exactly
- Entry chunk contains files → has code

Complex apps fail because:
- Many dynamic imports (e.g., Shiki with 100+ language files)
- Shared dependencies (React, etc.) are reachable from multiple entry points
- Even `main.tsx` can get additional bits if its dependencies are shared
- When `entry_bits = {0, 1, 2, ...}`, file goes to a shared chunk, not entry chunk

## Attempted Fix

### Change to `Chunk.zig` (Partial Fix)

```diff
pub fn getJSChunkForHTML(this: *const Chunk, chunks: []Chunk) ?*Chunk {
    const entry_point_id = this.entry_point.entry_point_id;
    for (chunks) |*other| {
        if (other.content == .javascript) {
-            if (other.entry_point.entry_point_id == entry_point_id) {
+            // Must match entry_point_id AND be marked as an entry point.
+            // With code splitting, there can be multiple chunks with the same
+            // entry_point_id but different entry_bits.
+            if (other.entry_point.entry_point_id == entry_point_id and other.entry_point.is_entry_point) {
                return other;
            }
        }
    }
    return null;
}
```

**This fix ensures HTML references the correct chunk**, but doesn't fix why that chunk is empty.

### What's Still Needed

The actual fix needs to ensure one of:

1. **Option A**: Entry chunk contains the HTML script's target file (`main.tsx`) regardless of its `entry_bits`

2. **Option B**: Entry chunk generates side-effect imports for chunks containing code reachable from the HTML (bit 0 set)

3. **Option C**: Reconsider how `entry_bits` are assigned for files directly referenced by HTML script tags

## Workaround

Disable code splitting:
```typescript
await Bun.build({
  // ...
  splitting: false,  // Produces single large bundle, but works
});
```

## Impact

- **Apps don't load**: Entry file is empty, no code executes
- **`Bun.serve()` fails**: HTML bundle object is invalid for routes
- **No error messages**: Build appears successful, failure is silent at runtime

## Related Files

- `src/bundler/Chunk.zig` - Chunk definition and `getJSChunkForHTML`
- `src/bundler/linker_context/computeChunks.zig` - Chunk creation and file assignment
- `src/bundler/linker_context/computeCrossChunkDependencies.zig` - Cross-chunk import generation
- `src/bundler/linker_context/findAllImportedPartsInJSOrder.zig` - Part assignment to chunks
- `src/bundler/LinkerContext.zig` - `markFileReachableForCodeSplitting`

## Test Case

A test exists at `test/regression/issue/html-splitting-empty-entry.test.ts` but it passes because the test cases are too simple to trigger the bug. The bug requires:
- Multiple dynamic imports creating many entry points
- Shared dependencies between main app and dynamic imports
- Complex enough that `main.tsx` ends up with multiple entry bits

---

**Reported**: December 26, 2025
**Severity**: High - Apps built with HTML entry + code splitting don't work
**Category**: Bundler / Code Splitting

