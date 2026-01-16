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
const UIElementSchema = z.object({
  key: z.string(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
  children: z.array(z.string()).optional(),
  parentKey: z.string().nullable().optional(),
});

const UITreeSchema = z.object({
  root: z.string(),
  elements: z.record(z.string(), UIElementSchema),
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

Guidelines:
1. Analyze the conversation to find data from tool results, file uploads, or user requests
2. Choose components that best fit the data shape:
   - DataTable for arrays of objects
   - Metric for single numeric values with optional change indicators
   - Chart for trends and comparisons
   - FlashCardDeck for learning content
   - KeyValue for structured key-value data
3. Use Grid/Stack/Card for layout organization
4. Keep it simple and readable
5. Ensure all element keys are unique strings
6. The root key must reference an element in the elements map

Output a valid UITree JSON object with:
- "root": string key of the root element
- "elements": object mapping keys to UIElement objects

Each UIElement has:
- "key": unique string identifier
- "type": component type from catalog
- "props": component props matching the schema
- "children": optional array of child element keys
- "parentKey": optional parent key (null for root)`;
};

/**
 * Generates UI as a stream of partial objects
 * Uses AI SDK's streamObject for progressive rendering
 */
export async function* generateUIStream(
  context: UIGenerationContext
): AsyncGenerator<{ partial?: Partial<UITree>; final?: UITree }> {
  const { intent, messages, model, abortSignal } = context;

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

  const result = streamObject({
    model: openrouter.chat(model),
    schema: UITreeSchema,
    system: createSystemPrompt(),
    messages: formattedMessages,
    abortSignal,
  });

  // Yield partial objects as they stream
  for await (const partialObject of result.partialObjectStream) {
    yield { partial: partialObject as Partial<UITree> };
  }

  // Yield final object
  const finalObject = await result.object;
  yield { final: finalObject as UITree };
}

/**
 * Generates UI synchronously (non-streaming)
 * For cases where streaming is not needed
 */
export async function generateUI(
  context: UIGenerationContext
): Promise<UITree> {
  const chunks: Array<{ partial?: Partial<UITree>; final?: UITree }> = [];
  for await (const chunk of generateUIStream(context)) {
    chunks.push(chunk);
  }
  const final = chunks.find((c) => c.final);
  if (!final?.final) {
    throw new Error("UI generation failed: no final result");
  }
  return final.final;
}
