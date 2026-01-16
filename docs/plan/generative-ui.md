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
│  - Has tool: render_ui({ intent? })  ← minimal/empty params    │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ Server-side: pass FULL conversation
                            │ (avoids main agent re-typing data tokens)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ UI Generation Agent (new)                                      │
│  - Receives: FULL conversation history (tool results, user     │
│    messages, assistant messages - all context)                 │
│  - Model: SAME as user selected for main agent                 │
│  - System prompt: component catalog description                │
│  - Output: STREAMED JSON for progressive rendering             │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ Stream chunks to client
                            ▼
┌────────────────────────────────────────────────────────────────┐
│ Client Renderer                                                │
│  - New message part type: 'generative-ui'                      │
│  - JSONUIProvider wraps component tree                         │
│  - Registry maps types → React components                      │
│  - Progressive render as JSON streams in                       │
│  - Actions can trigger callbacks to main agent                 │
└────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Empty/minimal tool params** - `render_ui` takes only optional `intent` string
   - Main agent does NOT re-type data in tool arguments
   - Avoids double token generation (main agent writes data → UI agent writes same data)
   - Server extracts full conversation and passes to UI agent

2. **Same model** - UI agent uses same model user selected for main agent
   - Passed via API request body (`model` field)
   - Consistent quality expectations

3. **Streaming** - UI generation streams to client
   - More responsive than waiting for complete JSON
   - Progressive rendering as chunks arrive

### Context Passing (Server-Side)

Server extracts context from conversation - main agent doesn't need to summarize:

```typescript
// Server-side when render_ui tool is called
function handleRenderUiTool(
  intent: string | undefined,
  conversationMessages: Message[],
  model: string  // from API request
) {
  // Pass FULL conversation to UI agent
  // No extraction/summarization by main agent = no duplicate tokens
  return generateUIStream({
    intent,
    messages: conversationMessages,
    model  // same model user selected
  });
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
     description: 'Generate a visual UI (dashboard, report, cards, flashcards) from data already in conversation. Use this when user wants to visualize data from previous tool calls or uploaded files.',
     parameters: z.object({
       intent: z.string().optional().describe('What to render: "table", "analytics dashboard", "summary", "flashcards", etc. If omitted, infer from conversation.')
     }),
     // NOTE: execute receives full messages from server context, NOT from tool params
     // This avoids main agent re-typing all data as tool arguments
   });

   // Server-side handler (in ai-response.ts or separate handler)
   async function executeRenderUiTool(
     toolCall: { intent?: string },
     context: {
       messages: Message[];
       model: string;        // same model user selected
       abortSignal: AbortSignal;
       writer: UIMessageStreamWriter;
     }
   ) {
     const { intent } = toolCall;
     const { messages, model, abortSignal, writer } = context;

     // Stream UI generation - passes FULL conversation, no data extraction
     const uiStream = await generateUIStream({
       intent,
       messages,  // full conversation history
       model,     // user's selected model
       abortSignal
     });

     // Forward stream chunks to client
     for await (const chunk of uiStream) {
       writer.write({ type: 'generative-ui-delta', delta: chunk });
     }
   }
   ```

4. **Create streaming UI generation function**
   ```typescript
   // packages/server/src/lib/generative-ui/generate.ts
   import { streamObject } from 'ai';
   import { openrouter } from '../openrouter';

   export async function generateUIStream({
     intent,
     messages,
     model,
     abortSignal
   }: {
     intent?: string;
     messages: Message[];
     model: string;
     abortSignal: AbortSignal;
   }) {
     const systemPrompt = `You generate UI layouts as JSON.

   Available components:
   ${generateCatalogPrompt(uiCatalog)}

   Rules:
   - Analyze the conversation to find data from tool results, file uploads, etc.
   - Choose components that best fit the data shape
   - Use DataTable for arrays of objects
   - Use Metric for single numeric values
   - Use Chart when trends/comparisons are useful
   - Use Grid/Stack for layout
   - Keep it simple and readable
   - If intent is provided, focus on that specific visualization`;

     // Use SAME model as main agent (user's selection)
     const result = streamObject({
       model: openrouter.chat(model),
       schema: uiCatalog.schemas.tree,
       system: systemPrompt,
       messages: [
         // Pass full conversation as context
         ...messages.map(m => ({
           role: m.role,
           content: formatMessageForUIAgent(m)  // includes tool results, text, files
         })),
         // Add intent as final user message if provided
         ...(intent ? [{ role: 'user' as const, content: `Generate UI for: ${intent}` }] : [])
       ],
       abortSignal
     });

     return result.partialObjectStream;  // stream for progressive rendering
   }

   function formatMessageForUIAgent(message: Message): string {
     // Format message parts for UI agent to understand
     return message.parts.map(part => {
       if (part.type === 'text') return part.text;
       if (part.type === 'tool') {
         return `[Tool: ${part.toolName}]\nInput: ${JSON.stringify(part.input)}\nOutput: ${JSON.stringify(part.output)}`;
       }
       if (part.type === 'file') return `[File: ${part.filename}]`;
       return '';
     }).join('\n');
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

8. **Handle UI generation in main stream**
   - When `render_ui` tool is called, intercept before normal tool execution
   - Call `generateUIStream()` with full conversation + user's model
   - Emit chunks as `generative-ui-delta` parts in main response stream
   - Client accumulates deltas → renders progressively

9. **Client-side streaming UI render**
   ```typescript
   // In messages-history.tsx or dedicated component
   function StreamingGenerativeUI({ partialTree }: { partialTree: Partial<UITree> }) {
     // json-render's Renderer handles partial trees gracefully
     // Components render as their data becomes available
     return (
       <JSONUIProvider>
         <Renderer
           tree={partialTree}
           registry={componentRegistry}
           // Fallback for incomplete nodes
           fallback={<Skeleton />}
         />
       </JSONUIProvider>
     );
   }
   ```

10. **Stream protocol addition**
    ```typescript
    // New stream chunk types
    type GenerativeUIStreamPart =
      | { type: 'generative-ui-start'; id: string }
      | { type: 'generative-ui-delta'; id: string; delta: Partial<UITree> }
      | { type: 'generative-ui-end'; id: string; tree: UITree };
    ```

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

Main agent generates UI JSON directly as part of response:

```typescript
// Main agent has dual output mode
const result = await streamText({
  model,
  tools: {
    // No render_ui tool, agent writes UI directly
  },
  // Agent decides when to output UI vs text
});
```

**Pros**: Single request, lower latency
**Cons**: Mixes concerns, main agent must understand UI schema, harder to tune separately

### C: Client-Side Generation

Pass data to client, run smaller model in browser/edge:

**Pros**: Reduces server load
**Cons**: Exposes data to client, limited model options

---

## Open Questions

1. **Context size limits** - Full conversation could be large. Truncation strategy for very long chats?

2. **Caching** - Should generated UIs be cached? Key by intent + conversation hash?

3. **Editing** - Can users modify generated UI? Save customizations?

4. **Error recovery** - What if UI generation fails? Fallback to text summary?

5. **Multi-user** - How do generated UIs behave in multi-user chats? Per-user or shared?

6. **Persistence** - Store final UI JSON in message parts for reload, or regenerate?

7. **Component expansion** - How to add domain-specific components without bloating catalog?

8. **Structured output support** - Not all models support structured output. Fallback for unsupported models?

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
