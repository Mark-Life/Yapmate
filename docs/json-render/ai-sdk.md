AI SDK Integration
Use json-render with the Vercel AI SDK for seamless streaming.

Installation

npm install ai
API Route Setup

```ts
// app/api/generate/route.ts
import { streamText } from "ai";
import { generateCatalogPrompt } from "@json-render/core";
import { catalog } from "@/lib/catalog";

export async function POST(req: Request) {
  const { prompt, currentTree } = await req.json();

  const systemPrompt = generateCatalogPrompt(catalog);

  // Optionally include current UI state for context
  const contextPrompt = currentTree
    ? `\n\nCurrent UI state:\n${JSON.stringify(currentTree, null, 2)}`
    : "";

  const result = streamText({
    model: "anthropic/claude-opus-4.5",
    system: systemPrompt + contextPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

Client-Side Hook
Use useUIStream on the client:

```ts
"use client";

import { useUIStream } from "@json-render/react";

function GenerativeUI() {
  const { tree, isLoading, error, generate } = useUIStream({
    endpoint: "/api/generate",
  });

  return (
    <div>
      <button
        onClick={() => generate("Create a dashboard with metrics")}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate"}
      </button>

      {error && <p className="text-red-500">{error.message}</p>}

      <Renderer tree={tree} registry={registry} />
    </div>
  );
}
```

Prompt Engineering
The generateCatalogPrompt function creates an optimized prompt that:

Lists all available components and their props
Describes available actions
Specifies the expected JSON output format
Includes examples for better generation
Custom System Prompts

```ts
const basePrompt = generateCatalogPrompt(catalog);

const customPrompt = `
${basePrompt}

Additional instructions:
- Always use Card components for grouping related content
- Prefer horizontal layouts (Row) for metrics
- Use consistent spacing with padding="md"
`;
```
