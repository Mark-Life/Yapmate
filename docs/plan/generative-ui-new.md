# Generative UI System - New Architecture

Based on patterns from Vercel's json-renderer library. Replaces current implementation.

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Core Types & Utilities | **DONE** | `@yapmate/core/generative-ui` |
| Phase 2: Catalog System | **DONE** | Removed `@json-render/core` dependency |
| Phase 3: Server Generation | TODO | Rewrite to JSONL patches |
| Phase 4: Client Renderer | TODO | New contexts + registry |
| Phase 5: Integration | TODO | Wire up streaming |

---

## Why Rebuild

Current issues:
- Nested element structure hard for LLM to stream incrementally
- No JSON patch streaming (full tree replacement each delta)
- Missing data binding system (props are static)
- No visibility conditions
- No action system with callbacks
- Catalog not schema-driven

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GENERATION                              │
├─────────────────────────────────────────────────────────────────┤
│  Catalog (Zod)  →  System Prompt  →  LLM  →  JSONL Patches     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERING                               │
├─────────────────────────────────────────────────────────────────┤
│  Patch Parser  →  UITree State  →  Renderer  →  React Output   │
│                        ↑                            ↓           │
│                   Data Context  ←──────────────  Actions        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Types & Utilities ✅ DONE

Location: `packages/core/src/generative-ui/`

### Files Created

| File | Exports |
|------|---------|
| `types.ts` | `UIElement`, `UITree`, `DynamicValue`, `VisibilityCondition`, `Action`, `EMPTY_TREE`, type guards |
| `path.ts` | `getByPath`, `setByPath`, `deleteByPath`, `hasPath`, `resolveDynamicValue`, `resolveAllDynamicValues`, `interpolateTemplate` |
| `visibility.ts` | `evaluateVisibility`, `visibleWhen`, `visibleWhenEquals`, `visibleWhenAll`, `visibleWhenAny`, `visibleWhenNot` |
| `patches.ts` | `JsonPatch`, `applyPatch`, `applyPatches`, `parsePatchLine`, `parsePatchLines`, `createPatchAccumulator`, `setRoot`, `addElement`, `replaceProp`, `removeElement` |
| `index.ts` | Barrel exports |

### Usage

```typescript
import {
  UITree,
  UIElement,
  applyPatch,
  evaluateVisibility,
  resolveDynamicValue,
  createPatchAccumulator
} from '@yapmate/core/generative-ui'
```

### Key Types

```typescript
// Flat element structure - children are string keys
type UIElement<P = Record<string, unknown>> = {
  key: string
  type: string
  props: P
  children?: string[]
  visible?: VisibilityCondition
}

// Tree with flat element map
type UITree = {
  root: string
  elements: Record<string, UIElement>
}

// Dynamic values for data binding
type DynamicValue<T = unknown> =
  | T
  | { path: string }
  | { template: string }

// JSON Patch operations
type JsonPatch =
  | { op: 'set'; path: '/root'; value: string }
  | { op: 'add'; path: string; value: UIElement }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string }
```

---

## Phase 2: Catalog System ✅ DONE

Location: `packages/server/src/lib/generative-ui/`

### Files Created/Updated

| File | Status | Exports |
|------|--------|---------|
| `catalog-builder.ts` | NEW | `createCatalog`, `defineComponent`, `defineAction`, `Catalog`, `ComponentDefinition`, `ActionDefinition` |
| `catalog.ts` | UPDATED | `uiCatalog` - removed `@json-render/core`, uses our builder |
| `types.ts` | UPDATED | Re-exports from `@yapmate/core/generative-ui`, chunk types |
| `generate.ts` | UPDATED | Uses `uiCatalog.generatePrompt()` |
| `tool.ts` | UPDATED | Removed `@json-render/core` import |
| `index.ts` | UPDATED | Exports catalog builder |

### Usage

```typescript
import {
  createCatalog,
  uiCatalog,
  type UITree,
  type JsonPatch
} from '@yapmate/server/lib/generative-ui'

// Generated prompt for LLM
const systemPrompt = uiCatalog.generatePrompt()

// Validation
const result = uiCatalog.validateTree(tree)
if (result.success) { /* use result.data */ }
```

### Catalog Features

- **Auto-generates system prompt** with all components, actions, data binding docs
- **Zod schema validation** for elements, trees, patches
- **Component registry** with 12 components (Grid, Stack, Card, DataTable, Metric, Chart, TextBlock, List, KeyValue, Button, FlashCard, FlashCardDeck)
- **Action registry** with 6 actions (export_csv, export_json, refresh_data, drill_down, flip_card, next_card)

### Generated Prompt Structure

```
1. Patch operations (set, add, replace, remove)
2. Element structure (key, type, props, children, visible)
3. Available components with props
4. Available actions with params
5. Data binding syntax ({path: "..."}, {template: "..."})
6. Visibility conditions
7. Rules
```

---

## Phase 3: Server Generation ✅ DONE

Location: `packages/server/src/lib/generative-ui/generate.ts`

### Current State
- Still uses `streamObject` with full tree output
- Emits partial tree on each delta

### To Do
1. Switch to `streamText` for JSONL output
2. Parse lines into patches
3. Emit patches instead of full tree
4. Use `createPatchAccumulator` from core

### Target Implementation

```typescript
async function* streamUI(ctx: StreamUIContext): AsyncGenerator<JsonPatch> {
  const stream = streamText({
    model: openrouter.chat(ctx.model),
    system: uiCatalog.generatePrompt(),
    messages: formatMessages(ctx.messages),
  })

  const accumulator = createPatchAccumulator()

  for await (const chunk of stream.textStream) {
    const patches = accumulator.process(chunk)
    for (const patch of patches) {
      yield patch
    }
  }

  for (const patch of accumulator.flush()) {
    yield patch
  }
}
```

---

## Phase 4: Client Renderer (TODO)

Location: `packages/components/src/ai-elements/generative-ui/`

### To Do

1. **Contexts**
   - `DataContext` - path-based get/set for data binding
   - `ActionContext` - action handlers with confirmation

2. **Renderer**
   - Recursive `ElementRenderer` with visibility checks
   - Component registry lookup

3. **Components**
   - Update existing components to use `resolveDynamicValue`
   - Add `useDataValue` hook for data binding

4. **Streaming Hook**
   - `useUIStream` - apply patches, track streaming state

---

## Phase 5: Integration (TODO)

### To Do

1. Update chat component to handle `ui-patch` chunks
2. Wire up `useUIStream` hook
3. Test with various generation prompts
4. Handle error states

---

## File Structure (Current)

```
packages/
├── core/
│   └── src/
│       └── generative-ui/          ✅ DONE
│           ├── types.ts
│           ├── path.ts
│           ├── visibility.ts
│           ├── patches.ts
│           └── index.ts
│
├── server/
│   └── src/
│       └── lib/
│           └── generative-ui/      ✅ Phase 2 DONE
│               ├── catalog-builder.ts   ← NEW
│               ├── catalog.ts           ← UPDATED
│               ├── types.ts             ← UPDATED
│               ├── generate.ts          ← UPDATED (needs Phase 3)
│               ├── tool.ts              ← UPDATED (needs Phase 3)
│               └── index.ts             ← UPDATED
│
└── components/
    └── src/
        └── ai-elements/
            └── generative-ui/      ⏳ Phase 4 TODO
                ├── contexts/
                ├── components/
                ├── registry.tsx
                ├── renderer.tsx
                └── hooks.ts
```

---

## Key Differences from Current Implementation

| Aspect | Current | New |
|--------|---------|-----|
| Element structure | Nested children objects | Flat map with string keys ✅ |
| Streaming | Full tree each delta | JSONL patches (Phase 3) |
| Data binding | Static props only | DynamicValue with paths ✅ |
| Visibility | None | Full condition system ✅ |
| Actions | Basic handlers | Callbacks, confirmation, chaining ✅ |
| Validation | Manual | Zod schema-driven ✅ |
| Prompt | Hardcoded | Generated from catalog ✅ |

---

## Open Questions

1. Should data context be global or per-UI instance?
2. How to handle component-specific actions (e.g., table row click)?
3. Need validation system for form inputs?
4. How to persist data changes back to server?
5. Should visibility be evaluated server-side for SSR?

---

## Dependencies

### Removed
- `@json-render/core` - no longer used in server (still in package.json, can remove)

### Added
- None - all new code uses existing deps (zod, ai)
