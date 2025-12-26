## Analysis Summary

**Current Setup:**
- Bun fullstack with HTML entry + `Bun.build()` for both client/server
- Heavy libs: `shiki` (~5MB), `recharts`, `@xyflow/react`, `streamdown`, `motion`, many Radix components
- Bun's code splitting bug = 13MB loaded on every page refresh

**Heavy Dependencies identified:**
- `shiki` - biggest culprit (all language grammars)
- `recharts` - charting
- `@xyflow/react` - flow diagrams
- `streamdown` - markdown rendering
- Many Radix UI components

---

## Proposal: Hybrid Build (Vite for Client + Bun for Server)

**Why Vite over pure Rollup:**
1. Rollup alone needs manual config for React, TS, CSS, assets → lots of boilerplate
2. Vite = Rollup + sensible defaults + great DX
3. Code splitting works perfectly out of the box
4. Built-in CSS/Tailwind handling
5. Your server stays on Bun (fast, no changes to API routes)

**Architecture:**
```
Production Build:
  ┌─────────────────┐     ┌──────────────────┐
  │  Vite           │     │  Bun.build()     │
  │  (Rollup)       │     │                  │
  │  Client bundle  │     │  Server bundle   │
  │  + code split   │     │                  │
  └────────┬────────┘     └────────┬─────────┘
           ↓                       ↓
      dist/client/            dist/index.js
      ├── index.html
      ├── assets/
      │   ├── main-[hash].js     ← entry chunk
      │   ├── vendor-[hash].js   ← react/radix (shared)
      │   ├── shiki-[hash].js    ← lazy loaded
      │   └── recharts-[hash].js ← lazy loaded
      └── ...

Server serves static files from dist/client/
```

**Expected improvements:**
- Initial load: ~200-500KB (React + core UI)
- Shiki: lazy loaded only when code blocks appear
- Charts: lazy loaded only on pages with charts
- ~10-20x reduction in initial bundle

---

## Changes Required

1. **Add Vite config** (`apps/web/vite.config.ts`) for client build
2. **Update `build.ts`** to call Vite for client, keep Bun for server
3. **Minor server change** - serve Vite's output structure
4. **Optional**: Add `React.lazy()` for heavy components (shiki, charts)

---

## Questions

1. **Dev mode**: Do you want to keep Bun's dev server (HMR) or switch to Vite dev server for client? Vite dev is faster for React HMR, but requires proxying API routes.

2. **Tailwind**: You're using `bun-plugin-tailwind`. Vite has `@tailwindcss/vite` plugin - should work seamlessly.

3. **Lazy loading**: Should I also set up `React.lazy()` for shiki/code-block and chart components to maximize splitting benefits?

Let me know if you want me to proceed with this approach, or if you'd prefer a different direction (e.g., pure Rollup, or waiting for Bun to fix the bug).