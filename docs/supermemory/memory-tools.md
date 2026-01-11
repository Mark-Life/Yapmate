# Memory Tools

> Add memory capabilities to your AI agents with Vercel AI SDK tools

Memory tools allow AI agents to search, add, and fetch memories.

## Setup

```typescript theme={null}
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";

const openai = createOpenAI({
  apiKey: "YOUR_OPENAI_KEY",
});

const result = await streamText({
  model: openai("gpt-5"),
  prompt: "Remember that my name is Alice",
  tools: supermemoryTools("YOUR_SUPERMEMORY_KEY"),
});
```

## Available Tools

### Search Memories

Semantic search through user memories:

```typescript theme={null}
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "What are my dietary preferences?",
  tools: supermemoryTools("API_KEY"),
});

// The AI will automatically call searchMemories tool
// Example tool call:
// searchMemories({ informationToGet: "dietary preferences and restrictions" })
```

### Add Memory

Store new information:

```typescript theme={null}
const result = await streamText({
  model: anthropic("claude-3-sonnet"),
  prompt: "Remember that I'm allergic to peanuts",
  tools: supermemoryTools("API_KEY"),
});

// The AI will automatically call addMemory tool
// Example tool call:
// addMemory({ memory: "User is allergic to peanuts" })
```

### Fetch Memory

Retrieve specific memory by ID:

```typescript theme={null}
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "Get the details of memory abc123",
  tools: supermemoryTools("API_KEY"),
});

// The AI will automatically call fetchMemory tool
// Example tool call:
// fetchMemory({ memoryId: "abc123" })
```

## Using Individual Tools

For more control, import tools separately:

```typescript theme={null}
import {
  searchMemoriesTool,
  addMemoryTool,
  fetchMemoryTool,
} from "@supermemory/tools/ai-sdk";

// Use only search tool
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "What do you know about me?",
  tools: {
    searchMemories: searchMemoriesTool("API_KEY", {
      projectId: "personal",
    }),
  },
});

// Combine with custom tools
const result = await streamText({
  model: anthropic("claude-3"),
  prompt: "Help me with my calendar",
  tools: {
    searchMemories: searchMemoriesTool("API_KEY"),
    // Your custom tools
    createEvent: yourCustomTool,
    sendEmail: anotherCustomTool,
  },
});
```

## Tool Results

Each tool returns a result object:

```typescript theme={null}
// searchMemories result
{
  success: true,
  results: [...],  // Array of memories
  count: 5
}

// addMemory result
{
  success: true,
  memory: { id: "mem_123", ... }
}

// fetchMemory result
{
  success: true,
  memory: { id: "mem_123", content: "...", ... }
}
```

## Next Steps

<CardGroup cols={2}>
  <Card title="Infinite Chat" icon="infinity" href="/ai-sdk/infinite-chat">
    Try automatic memory management
  </Card>

  <Card title="Examples" icon="code" href="/cookbook/ai-sdk-integration">
    See more complete examples
  </Card>
</CardGroup>

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://supermemory.ai/docs/llms.txt
