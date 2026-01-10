# AI SDK Integration

> Use Supermemory with Vercel AI SDK for seamless memory management

The Supermemory AI SDK provides native integration with Vercel's AI SDK through three approaches: **User Profiles** for automatic personalization, **Memory Tools** for agent-based interactions, and **Infinite Chat** for automatic context management.

<Card title="Supermemory tools on npm" icon="npm" href="https://www.npmjs.com/package/@supermemory/tools">
  Check out the NPM page for more details
</Card>

## Installation

```bash theme={null}
npm install @supermemory/tools
```

## User Profiles with Middleware

Automatically inject user profiles into every LLM call for instant personalization. Customize how memories are formatted with the `promptTemplate` option for XML-based prompting, custom branding, or model-specific formatting.

```typescript theme={null}
import { generateText } from "ai";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { openai } from "@ai-sdk/openai";

// Wrap your model with Supermemory - profiles are automatically injected
const modelWithMemory = withSupermemory(openai("gpt-5"), "user-123");

const result = await generateText({
  model: modelWithMemory,
  messages: [{ role: "user", content: "What do you know about me?" }],
});
// The model automatically has the user's profile context!
```

<Note>
  **Memory saving is disabled by default.** The middleware only retrieves existing memories. To automatically save new memories from conversations, enable it explicitly:

```typescript theme={null}
const modelWithMemory = withSupermemory(openai("gpt-5"), "user-123", {
  addMemory: "always",
});
```

</Note>

```typescript theme={null}

```

## Memory Tools

Add memory capabilities to AI agents with search, add, and fetch operations.

```typescript theme={null}
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";

const anthropic = createAnthropic({
  apiKey: "YOUR_ANTHROPIC_KEY",
});

const result = await streamText({
  model: anthropic("claude-3-sonnet"),
  prompt: "Remember that my name is Alice",
  tools: supermemoryTools("YOUR_SUPERMEMORY_KEY"),
});
```

## Infinite Chat

Automatic memory management for chat applications with unlimited context.

```typescript theme={null}
import { streamText } from "ai";

const infiniteChat = createAnthropic({
  baseUrl: "https://api.supermemory.ai/v3/https://api.anthropic.com/v1",
  apiKey: "your-provider-api-key",
  headers: {
    "x-supermemory-api-key": "supermemory-api-key",
    "x-sm-conversation-id": "conversation-id",
  },
});

const result = await streamText({
  model: infiniteChat("claude-3-sonnet"),
  messages: [{ role: "user", content: "What's my name?" }],
});
```

## When to Use

| Approach      | Use Case                                               |
| ------------- | ------------------------------------------------------ |
| User Profiles | Personalized LLM responses with automatic user context |
| Memory Tools  | AI agents that need explicit memory control            |
| Infinite Chat | Chat applications with automatic context               |

## Next Steps

<CardGroup cols={3}>
  <Card title="User Profiles" icon="user" href="/ai-sdk/user-profiles">
    Automatic personalization with profiles
  </Card>

  <Card title="Memory Tools" icon="wrench" href="/ai-sdk/memory-tools">
    Agent-based memory management
  </Card>

  <Card title="Infinite Chat" icon="infinity" href="/ai-sdk/infinite-chat">
    Automatic context management
  </Card>
</CardGroup>

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://supermemory.ai/docs/llms.txt
