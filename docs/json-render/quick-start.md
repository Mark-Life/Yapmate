Quick Start
Get up and running with json-render in 5 minutes.

1. Define your catalog
   Create a catalog that defines what components AI can use:

```ts
// lib/catalog.ts
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      hasChildren: true,
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
    },
  },
  actions: {
    submit: {
      params: z.object({ formId: z.string() }),
    },
    navigate: {
      params: z.object({ url: z.string() }),
    },
  },
});
2. Create your components
Register React components that render each catalog type:
```

```ts
// components/registry.tsx
export const registry = {
  Card: ({ element, children }) => (
    <div className="p-4 border rounded-lg">
      <h2 className="font-bold">{element.props.title}</h2>
      {element.props.description && (
        <p className="text-gray-600">{element.props.description}</p>
      )}
      {children}
    </div>
  ),
  Button: ({ element, onAction }) => (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={() => onAction(element.props.action, {})}
    >
      {element.props.label}
    </button>
  ),
  Text: ({ element }) => <p>{element.props.content}</p>,
};
```

3. Create an API route
   Set up a streaming API route for AI generation:

```ts
// app/api/generate/route.ts
import { streamText } from 'ai';
import { generateCatalogPrompt } from '@json-render/core';
import { catalog } from '@/lib/catalog';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const systemPrompt = generateCatalogPrompt(catalog);

  const result = streamText({
    model: 'anthropic/claude-opus-4.5',
    system: systemPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
4. Render the UI
Use the providers and renderer to display AI-generated UI:
```

```ts
// app/page.tsx
"use client";

import {
  DataProvider,
  ActionProvider,
  VisibilityProvider,
  Renderer,
  useUIStream,
} from "@json-render/react";
import { registry } from "@/components/registry";

export default function Page() {
  const { tree, isLoading, generate } = useUIStream({
    endpoint: "/api/generate",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    generate(formData.get("prompt") as string);
  };

  return (
    <DataProvider initialData={{}}>
      <VisibilityProvider>
        <ActionProvider
          handlers={{
            submit: (params) => console.log("Submit:", params),
            navigate: (params) => console.log("Navigate:", params),
          }}
        >
          <form onSubmit={handleSubmit}>
            <input
              name="prompt"
              placeholder="Describe what you want..."
              className="border p-2 rounded"
            />
            <button type="submit" disabled={isLoading}>
              Generate
            </button>
          </form>

          <div className="mt-8">
            <Renderer tree={tree} registry={registry} />
          </div>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}
```
