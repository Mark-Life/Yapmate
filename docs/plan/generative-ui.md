# Generative UI Integration Plan

## Overview

Integrate json-render by Vercel Labs to enable AI-generated dashboards, reports, and visualizations from natural language prompts or accumulated context data.

**Goal**: When agent has data in context (from MCP tools, CSV uploads, etc.), it can call a `render_ui` tool that passes context to a UI generation sub-agent, which outputs validated JSON rendered as React components.

---

## External Resources

### json-render Library

- **GitHub**: https://github.com/vercel-labs/json-render
- **License**: Apache-2.0
- **Packages**:
  - `@json-render/core` - types, schemas, visibility, actions, validation
  - `@json-render/react` - renderer, providers, hooks

### Key Concepts

1. **Catalog** - predefined component/action schemas (Zod-based)
2. **Renderer** - maps JSON tree → React components via registry
3. **Guardrails** - AI can only generate components in catalog
4. **Streaming** - progressive render as JSON streams

---

## Current Architecture Summary

### Data Flow

```
User Input → ChatInput → Transport → Server Handler → AI SDK streamText
                                           ↓
                                    executeAiResponse()
                                           ↓
                              createUIMessageStream() → chunks
                                           ↓
                              processStreamChunks() → Redis buffer + broadcast
                                           ↓
                              Client receives via SSE / WebSocket
                                           ↓
                              MessagesHistory renders parts
```

### Key Files

| Path | Purpose |
|------|---------|
| `apps/web/src/client/components/chat/chat.tsx` | Main chat, stream handling |
| `apps/web/src/client/components/chat/messages-history.tsx` | Message part rendering |
| `packages/server/src/routes/api/chat/handler.ts` | Chat POST handler |
| `packages/server/src/routes/api/chat/ai-response.ts` | AI SDK integration |
| `packages/server/src/routes/api/chat/stream.ts` | Stream orchestration |
| `packages/server/src/lib/mcp/` | MCP tool resolution |

### Existing Tool Pattern

MCP tools already use approval workflow:
```typescript
const wrappedMcpTools = Object.fromEntries(
  Object.entries(mcpTools).map(([name, tool]) => [
    name,
    { ...tool, needsApproval: true }
  ])
);
```

Tool results stored in message parts:
```typescript
{
  type: 'tool',
  toolCallId: 'xxx',
  toolName: 'query_database',
  input: { sql: 'SELECT ...' },
  output: { rows: [...] }
}
```

---

## Proposed Architecture

### Two-Agent Pattern

```
┌────────────────────────────────────────────────────────────────┐
│ Main Agent (existing chat flow)                                │
│  - Uses MCP tools (postgres, supabase, etc.)                   │
│  - Receives file uploads (CSV, JSON)                           │
│  - Accumulates data in conversation context                    │
│  - Has tool: render_ui({ intent, data_summary? })              │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ UI Generation Agent (new)                                      │
│  - Receives: user intent + relevant context (tool results)     │
│  - System prompt: component catalog description                │
│  - Output: structured JSON (validated against catalog schema)  │
│  - Uses OpenAI/Anthropic structured output for reliability     │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Client Renderer                                                │
│  - New message part type: 'generative-ui'                      │
│  - JSONUIProvider wraps component tree                         │
│  - Registry maps types → React components                      │
│  - Actions can trigger callbacks to main agent                 │
└────────────────────────────────────────────────────────────────┘
```

### Context Extraction Strategy

Main agent decides what to pass to UI agent. Options:

1. **Full tool results** - for small data sets
2. **Summarized data** - schema + sample rows + aggregates
3. **Data reference** - ID/key, UI agent re-fetches if needed

```typescript
// Example context extraction
function extractUIContext(messages: Message[]) {
  const toolResults = messages
    .flatMap(m => m.parts)
    .filter(p => p.type === 'tool')
    .map(p => ({
      tool: p.toolName,
      input: p.input,
      output: p.output
    }));

  const userIntent = messages
    .filter(m => m.role === 'user')
    .map(m => m.parts.find(p => p.type === 'text')?.text)
    .filter(Boolean)
    .join('\n');

  return { toolResults, userIntent };
}
```

---

## Generic Component Catalog

Since MCP tools are dynamic, catalog must be data-agnostic:

```typescript
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const uiCatalog = createCatalog({
  name: 'generative-dashboard',
  validation: 'strict',

  components: {
    // Layout
    Grid: {
      props: z.object({
        columns: z.number().min(1).max(12),
        gap: z.number().nullable()
      }),
      hasChildren: true,
      description: 'Grid layout with configurable columns'
    },
    Stack: {
      props: z.object({
        direction: z.enum(['vertical', 'horizontal']),
        gap: z.number().nullable()
      }),
      hasChildren: true,
      description: 'Flex stack layout'
    },
    Card: {
      props: z.object({
        title: z.string().nullable(),
        subtitle: z.string().nullable()
      }),
      hasChildren: true,
      description: 'Container card with optional title'
    },

    // Data Display - Generic
    DataTable: {
      props: z.object({
        data: z.array(z.record(z.unknown())),
        columns: z.array(z.object({
          key: z.string(),
          label: z.string(),
          format: z.enum(['text', 'number', 'date', 'currency']).nullable()
        })),
        pageSize: z.number().nullable()
      }),
      hasChildren: false,
      description: 'Table for any array of objects'
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        change: z.string().nullable(),
        changeType: z.enum(['positive', 'negative', 'neutral']).nullable()
      }),
      hasChildren: false,
      description: 'Single metric display with optional change indicator'
    },
    Chart: {
      props: z.object({
        type: z.enum(['bar', 'line', 'pie', 'area']),
        data: z.array(z.record(z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        title: z.string().nullable()
      }),
      hasChildren: false,
      description: 'Chart visualization'
    },

    // Content
    TextBlock: {
      props: z.object({
        content: z.string(),
        variant: z.enum(['body', 'heading', 'caption']).nullable()
      }),
      hasChildren: false,
      description: 'Markdown text block'
    },
    List: {
      props: z.object({
        items: z.array(z.string()),
        ordered: z.boolean().nullable()
      }),
      hasChildren: false,
      description: 'Bullet or numbered list'
    },
    KeyValue: {
      props: z.object({
        pairs: z.array(z.object({
          key: z.string(),
          value: z.string()
        }))
      }),
      hasChildren: false,
      description: 'Key-value pairs display'
    },

    // Interactive
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(['primary', 'secondary', 'outline']).nullable()
      }),
      hasChildren: false,
      description: 'Action button'
    },

    // Specialized
    FlashCard: {
      props: z.object({
        front: z.string(),
        back: z.string(),
        hint: z.string().nullable(),
        category: z.string().nullable()
      }),
      hasChildren: false,
      description: 'Flashcard for learning'
    },
    FlashCardDeck: {
      props: z.object({
        title: z.string(),
        cards: z.array(z.object({
          front: z.string(),
          back: z.string(),
          hint: z.string().nullable()
        }))
      }),
      hasChildren: false,
      description: 'Collection of flashcards'
    }
  },

  actions: {
    export_csv: { description: 'Export data as CSV' },
    export_json: { description: 'Export data as JSON' },
    refresh_data: { description: 'Re-fetch data from source' },
    drill_down: { description: 'Show detailed view of selected item' },
    flip_card: { description: 'Flip flashcard to see answer' },
    next_card: { description: 'Move to next flashcard' }
  }
});
```

---

## Implementation Steps

### Phase 1: Foundation

1. **Install packages**
   ```bash
   pnpm add @json-render/core @json-render/react
   ```

2. **Create catalog** at `packages/server/src/lib/generative-ui/catalog.ts`

3. **Create render_ui tool definition**
   ```typescript
   // packages/server/src/lib/generative-ui/tool.ts
   export const renderUiTool = tool({
     description: 'Generate a visual UI (dashboard, report, cards) from data in context',
     parameters: z.object({
       intent: z.string().describe('What the user wants to visualize'),
       dataDescription: z.string().optional().describe('Brief description of data to render')
     }),
     execute: async ({ intent, dataDescription }, { messages, abortSignal }) => {
       // Extract relevant context
       const context = extractUIContext(messages);

       // Call UI generation agent
       const uiJson = await generateUI({
         intent,
         dataDescription,
         context,
         abortSignal
       });

       // Validate against catalog
       const validated = uiCatalog.validateTree(uiJson);
       if (!validated.success) {
         throw new Error('Generated UI failed validation');
       }

       return { ui: validated.data };
     }
   });
   ```

4. **Create UI generation function**
   ```typescript
   // packages/server/src/lib/generative-ui/generate.ts
   import { generateObject } from 'ai';

   export async function generateUI({ intent, context, abortSignal }) {
     const systemPrompt = `You generate UI layouts as JSON.

   Available components:
   ${generateCatalogPrompt(uiCatalog)}

   Rules:
   - Choose components that best fit the data shape
   - Use DataTable for arrays of objects
   - Use Metric for single numeric values
   - Use Chart when trends/comparisons are useful
   - Use Grid/Stack for layout
   - Keep it simple and readable`;

     const { object } = await generateObject({
       model: openrouter.chat('openai/gpt-4o-mini'),
       schema: uiCatalog.schemas.tree,
       system: systemPrompt,
       prompt: `User intent: ${intent}\n\nData context:\n${JSON.stringify(context, null, 2)}`,
       abortSignal
     });

     return object;
   }
   ```

### Phase 2: Message Part Integration

5. **Add new message part type**
   ```typescript
   // packages/core/src/types/message.ts
   type GenerativeUIPart = {
     type: 'generative-ui';
     ui: UITree;  // from @json-render/core
   };
   ```

6. **Create renderer component**
   ```typescript
   // packages/components/src/chat/generative-ui-part.tsx
   import { Renderer, JSONUIProvider } from '@json-render/react';
   import { componentRegistry } from './ui-components';

   export function GenerativeUIPart({ ui }: { ui: UITree }) {
     return (
       <JSONUIProvider>
         <div className="generative-ui-container">
           <Renderer tree={ui} registry={componentRegistry} />
         </div>
       </JSONUIProvider>
     );
   }
   ```

7. **Implement component registry** - map catalog types to React components

### Phase 3: Stream Integration

8. **Handle UI generation in stream**
   - When tool result contains `{ ui: ... }`, emit as `generative-ui` part
   - Client renders via `GenerativeUIPart`

9. **Optional: Stream UI generation**
   - Use `useUIStream` hook from json-render for progressive rendering
   - Requires separate SSE endpoint for UI stream

### Phase 4: Actions & Interactivity

10. **Wire up action handlers**
    - `export_csv` → trigger download
    - `refresh_data` → re-run original MCP tool
    - `drill_down` → send follow-up message to agent

---

## Alternative Approaches

### A: Tool Result Renderer (Simpler)

Instead of separate agent, detect data shape in tool results and auto-render:

```typescript
// When tool returns array of objects, offer table view
// When tool returns numbers, show as metrics
// No natural language → JSON step
```

**Pros**: Simpler, no extra LLM call
**Cons**: Less flexible, no custom layouts

### B: Inline Generation (No Sub-Agent)

Main agent generates UI JSON directly using structured output:

```typescript
const result = await generateObject({
  model,
  schema: z.union([
    z.object({ type: z.literal('text'), content: z.string() }),
    z.object({ type: z.literal('ui'), tree: uiCatalog.schemas.tree })
  ]),
  // ...
});
```

**Pros**: Single request, lower latency
**Cons**: Mixes concerns, harder to tune

### C: Client-Side Generation

Pass data to client, run smaller model in browser/edge:

**Pros**: Reduces server load
**Cons**: Exposes data to client, limited model options

---

## Open Questions

1. **Context size limits** - How much data can we pass to UI agent? Need truncation strategy?

2. **Caching** - Should generated UIs be cached? Key by intent + data hash?

3. **Editing** - Can users modify generated UI? Save customizations?

4. **Streaming** - Should UI generation stream chunks, or return complete JSON?

5. **Error recovery** - What if UI generation fails? Fallback to text summary?

6. **Multi-user** - How do generated UIs behave in multi-user chats? Per-user or shared?

7. **Persistence** - Store UI JSON in message parts, or regenerate on load?

8. **Component expansion** - How to add domain-specific components without bloating catalog?

---

## File Structure (Proposed)

```
packages/
├── server/src/lib/generative-ui/
│   ├── index.ts           # Public exports
│   ├── catalog.ts         # Component catalog definition
│   ├── generate.ts        # UI generation agent
│   ├── tool.ts            # render_ui tool definition
│   ├── context.ts         # Context extraction utilities
│   └── types.ts           # Type definitions
│
├── components/src/chat/
│   ├── generative-ui-part.tsx    # Main renderer wrapper
│   └── ui-components/
│       ├── index.ts              # Component registry
│       ├── layout/
│       │   ├── grid.tsx
│       │   ├── stack.tsx
│       │   └── card.tsx
│       ├── data/
│       │   ├── data-table.tsx
│       │   ├── metric.tsx
│       │   └── chart.tsx
│       ├── content/
│       │   ├── text-block.tsx
│       │   ├── list.tsx
│       │   └── key-value.tsx
│       └── specialized/
│           ├── flash-card.tsx
│           └── flash-card-deck.tsx
│
├── core/src/types/
│   └── message.ts         # Add GenerativeUIPart type
```

---

## Dependencies

```json
{
  "@json-render/core": "^0.x.x",
  "@json-render/react": "^0.x.x",
  "recharts": "^2.x.x"  // For chart components
}
```

---

## References

- json-render GitHub: https://github.com/vercel-labs/json-render
- Vercel AI SDK structured output: https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
- OpenAI structured outputs: https://platform.openai.com/docs/guides/structured-outputs
