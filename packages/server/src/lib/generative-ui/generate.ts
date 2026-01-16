/**
 * UI generation using AI SDK streamObject
 * Generates structured UI JSON from conversation context
 */
import { generateCatalogPrompt, type UITree } from "@json-render/core";
import { streamObject } from "ai";
import { z } from "zod";
import { openrouter } from "../openrouter";
import { uiCatalog } from "./catalog";
import type { UIGenerationContext } from "./types";

/** Schema for UI tree generation */
export const UIElementSchema = z.object({
  key: z.string(),
  type: z.string(),
  // Use passthrough object instead of record to avoid propertyNames in JSON schema
  props: z.object({}).passthrough(),
  children: z.array(z.string()).optional(),
  parentKey: z.string().nullable().optional(),
});

// Use z.any() for elements since z.record() generates propertyNames which Anthropic doesn't support
// The system prompt will guide the model to produce the correct structure
export const UITreeSchema = z.object({
  root: z.string(),
  elements: z.any(),
});

/** Formats a message part for the UI generation agent */
const formatMessagePart = (part: { type: string; [key: string]: unknown }) => {
  if (part.type === "text" && "text" in part) {
    return part.text as string;
  }
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    const toolPart = part as {
      toolName?: string;
      input?: unknown;
      output?: unknown;
    };
    const lines: string[] = [];
    lines.push(`[Tool: ${toolPart.toolName ?? "unknown"}]`);
    if (toolPart.input) {
      lines.push(`Input: ${JSON.stringify(toolPart.input, null, 2)}`);
    }
    if (toolPart.output) {
      lines.push(`Output: ${JSON.stringify(toolPart.output, null, 2)}`);
    }
    return lines.join("\n");
  }
  if (part.type === "file") {
    const mediaType = part.mediaType as string | undefined;
    const filename = part.filename as string | undefined;
    return `[File: ${filename ?? mediaType ?? "unknown"}]`;
  }
  return "";
};

/** Formats a message for the UI generation agent */
const formatMessageForUIAgent = (message: {
  role: string;
  parts: Array<{ type: string; [key: string]: unknown }>;
}) => {
  const content = message.parts
    .map(formatMessagePart)
    .filter(Boolean)
    .join("\n\n");
  return content;
};

/** System prompt for UI generation */
const createSystemPrompt = () => {
  const catalogPrompt = generateCatalogPrompt(uiCatalog);

  return `You are a UI generation agent. Generate structured JSON that describes UI layouts.

${catalogPrompt}

## CRITICAL: Output Format

You MUST output a UITree with this EXACT structure:

\`\`\`json
{
  "root": "element_key_here",
  "elements": {
    "element_key_here": {
      "key": "element_key_here",
      "type": "ComponentName",
      "props": { ... },
      "children": ["child_key_1", "child_key_2"],
      "parentKey": null
    },
    "child_key_1": {
      "key": "child_key_1",
      "type": "ComponentName",
      "props": { ... },
      "children": [],
      "parentKey": "element_key_here"
    }
  }
}
\`\`\`

IMPORTANT:
- "elements" MUST be an OBJECT (not an array!) where keys are element IDs
- Each element's "key" property must match its key in the elements object
- "children" is an array of element key strings (references, not nested objects)
- "root" must be a key that exists in "elements"

## Example - Dashboard with Metrics

\`\`\`json
{
  "root": "dashboard",
  "elements": {
    "dashboard": {
      "key": "dashboard",
      "type": "Grid",
      "props": { "columns": 2, "gap": 16 },
      "children": ["metric1", "metric2"],
      "parentKey": null
    },
    "metric1": {
      "key": "metric1",
      "type": "Metric",
      "props": { "label": "Total Users", "value": "1,234", "change": "+12%", "changeType": "positive" },
      "children": [],
      "parentKey": "dashboard"
    },
    "metric2": {
      "key": "metric2",
      "type": "Metric",
      "props": { "label": "Revenue", "value": "$45,678", "change": "-3%", "changeType": "negative" },
      "children": [],
      "parentKey": "dashboard"
    }
  }
}
\`\`\`

## Guidelines

1. Analyze the conversation to find data from tool results, file uploads, or user requests
2. Choose components that best fit the data shape:
   - DataTable for arrays of objects
   - Metric for single numeric values with optional change indicators
   - Chart for trends and comparisons
   - FlashCardDeck for learning content
   - KeyValue for structured key-value data
3. Use Grid/Stack/Card for layout organization
4. Keep it simple and readable
5. Ensure all element keys are unique strings`;
};

/** Context for streaming UI generation */
export type StreamUIContext = UIGenerationContext & {
  /** Callback for partial UI updates */
  onPartial?: (partial: Partial<UITree>) => void;
};

/**
 * Streams UI generation using streamObject for progressive rendering
 * Yields partial UI trees as they are generated
 */
export async function* streamUI(
  context: StreamUIContext
): AsyncGenerator<Partial<UITree>, UITree, unknown> {
  const { intent, messages, model, abortSignal, onPartial } = context;

  // Format messages for the UI agent
  const formattedMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: formatMessageForUIAgent(m),
  }));

  // Add intent as final user message if provided
  if (intent) {
    formattedMessages.push({
      role: "user",
      content: `Generate UI for: ${intent}`,
    });
  }

  console.log("[streamUI] Starting streaming generation with model:", model);
  console.log("[streamUI] Intent:", intent);

  const result = streamObject({
    model: openrouter.chat(model),
    schema: UITreeSchema,
    system: createSystemPrompt(),
    messages: formattedMessages,
    abortSignal,
  });

  let lastPartial: Partial<UITree> | null = null;

  for await (const partial of result.partialObjectStream) {
    lastPartial = partial as Partial<UITree>;
    console.log("[streamUI] Partial update:", JSON.stringify(partial, null, 2));
    onPartial?.(lastPartial);
    yield lastPartial;
  }

  // Get final validated object
  const uiTree = await result.object;

  console.log(
    "[streamUI] Final UI tree from result.object:",
    JSON.stringify(uiTree, null, 2)
  );
  console.log("[streamUI] Last partial:", JSON.stringify(lastPartial, null, 2));

  // If result.object is empty but we have a good lastPartial, use that
  if (
    (!uiTree?.elements || Object.keys(uiTree.elements).length === 0) &&
    lastPartial?.elements &&
    Object.keys(lastPartial.elements).length > 0
  ) {
    console.log("[streamUI] Using lastPartial as final tree");
    return lastPartial as UITree;
  }

  return uiTree as UITree;
}
