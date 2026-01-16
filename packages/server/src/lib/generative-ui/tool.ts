/**
 * render_ui tool definition
 * Allows the main agent to trigger UI generation with streaming
 */
import type { UITree } from "@json-render/core";
import type { UIMessage } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { streamUI } from "./generate";
import type { ChunkEmitter } from "./types";

const renderUiInputSchema = z.object({
  intent: z
    .string()
    .describe(
      'What to render: "table of results", "analytics dashboard", "summary metrics", "flashcards for learning", etc.'
    ),
});

export type RenderUiToolInput = z.infer<typeof renderUiInputSchema>;

/** Generate a unique ID for UI elements */
const generateUiId = (): string => {
  // Use crypto.randomUUID if available, fallback to timestamp-based ID
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/** Options for creating the render_ui tool */
export type CreateRenderUiToolOptions = {
  messages: UIMessage[];
  model: string;
  chunkEmitter?: ChunkEmitter;
  abortSignal?: AbortSignal;
};

/**
 * Creates the render_ui tool with access to conversation context and streaming
 * @param options - Tool options including messages, model, and optional chunk emitter
 */
export function createRenderUiTool(options: CreateRenderUiToolOptions) {
  const { messages, model, chunkEmitter, abortSignal } = options;

  return tool({
    description: `Generate a visual UI (dashboard, report, cards, flashcards) from data already in the conversation.

Use this tool when:
- User wants to visualize data from previous tool calls (database queries, API responses, etc.)
- User uploads a CSV/JSON file and wants it displayed nicely
- User asks for a dashboard, report, chart, or visualization
- User wants flashcards created from learning material

The UI will be generated based on the full conversation context - you don't need to pass the data again.
Just describe what kind of visualization you want to create.`,
    inputSchema: renderUiInputSchema,
    execute: async ({ intent }: RenderUiToolInput) => {
      const id = generateUiId();

      try {
        // Emit start chunk if we have an emitter
        if (chunkEmitter) {
          await chunkEmitter.emit({ type: "generative-ui-start", id });
        }

        // Stream UI generation with partial updates
        const generator = streamUI({
          intent,
          messages,
          model,
          abortSignal,
        });

        let finalTree: UITree | null = null;
        let lastPartial: Partial<UITree> | null = null;

        // Manually iterate to capture both yielded values and return value
        let result = await generator.next();
        while (!result.done) {
          const partial = result.value;
          lastPartial = partial;

          // Emit delta chunk for each partial update
          if (chunkEmitter) {
            await chunkEmitter.emit({
              type: "generative-ui-delta",
              id,
              delta: JSON.stringify(partial),
            });
          }

          result = await generator.next();
        }

        // The generator's return value is in result.value when done is true
        finalTree = result.value as UITree;

        // Fallback to last partial if return value is somehow empty
        if (
          (!finalTree?.elements ||
            Object.keys(finalTree.elements).length === 0) &&
          lastPartial?.root &&
          lastPartial?.elements &&
          Object.keys(lastPartial.elements).length > 0
        ) {
          finalTree = lastPartial as UITree;
        }

        if (
          !finalTree?.elements ||
          Object.keys(finalTree.elements).length === 0
        ) {
          throw new Error("UI generation completed without producing elements");
        }

        // Emit end chunk with final tree
        if (chunkEmitter) {
          await chunkEmitter.emit({
            type: "generative-ui-end",
            id,
            tree: finalTree,
          });
        }

        return {
          success: true,
          type: "generative-ui" as const,
          uiId: id,
          ui: finalTree,
        };
      } catch (error) {
        // Emit error chunk if streaming
        if (chunkEmitter) {
          await chunkEmitter.emit({
            type: "generative-ui-error",
            id,
            error:
              error instanceof Error ? error.message : "UI generation failed",
          });
        }

        return {
          success: false,
          uiId: id,
          error:
            error instanceof Error ? error.message : "UI generation failed",
        };
      }
    },
  });
}
