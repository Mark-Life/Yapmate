Streaming
Progressively render UI as AI generates it.

How Streaming Works
json-render uses JSONL (JSON Lines) streaming. As AI generates, each line represents a patch operation:

```json
{"op":"set","path":"/root","value":{"key":"root","type":"Card","props":{"title":"Dashboard"}}}
{"op":"add","path":"/root/children","value":{"key":"metric-1","type":"Metric","props":{"label":"Revenue"}}}
{"op":"add","path":"/root/children","value":{"key":"metric-2","type":"Metric","props":{"label":"Users"}}}
```

useUIStream Hook
The hook handles parsing and state management:

```ts
import { useUIStream } from "@json-render/react";

function App() {
  const {
    tree, // Current UI tree state
    isLoading, // True while streaming
    error, // Any error that occurred
    generate, // Function to start generation
    abort, // Function to cancel streaming
  } = useUIStream({
    endpoint: "/api/generate",
  });
}
```

Patch Operations
Supported operations:

set — Set the value at a path (creates if needed)
add — Add to an array at a path
replace — Replace value at a path
remove — Remove value at a path
Path Format
Paths use a key-based format for elements:

/root -> Root element
/root/children -> Children of root
/elements/card-1 -> Element with key "card-1"
/elements/card-1/children -> Children of card-1
Server-Side Setup
Ensure your API route streams properly:

```ts
export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamText({
    model: "anthropic/claude-opus-4.5",
    system: generateCatalogPrompt(catalog),
    prompt,
  });

  // Return as a streaming response
  return new Response(result.textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
```

Progressive Rendering
The Renderer automatically updates as the tree changes:

```ts
function App() {
  const { tree, isLoading } = useUIStream({ endpoint: "/api/generate" });

  return (
    <div>
      {isLoading && <LoadingIndicator />}
      <Renderer tree={tree} registry={registry} />
    </div>
  );
}
```

Aborting Streams

```ts
function App() {
  const { isLoading, generate, abort } = useUIStream({
    endpoint: "/api/generate",
  });

  return (
    <div>
      <button onClick={() => generate("Create dashboard")}>Generate</button>
      {isLoading && <button onClick={abort}>Cancel</button>}
    </div>
  );
}
```
