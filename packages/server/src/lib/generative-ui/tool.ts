/**
 * render_ui tool definition
 * Allows the main agent to trigger UI generation
 */
import type { UIMessage } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { generateUI } from "./generate";

const renderUiInputSchema = z.object({
  intent: z
    .string()
    .describe(
      'What to render: "table of results", "analytics dashboard", "summary metrics", "flashcards for learning", etc.'
    ),
});

export type RenderUiToolInput = z.infer<typeof renderUiInputSchema>;

/**
 * Creates the render_ui tool with access to conversation context
 * @param messages - Full conversation history for context
 * @param model - Model ID to use for UI generation (same as user's selected model)
 */
export function createRenderUiTool(messages: UIMessage[], model: string) {
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
      try {
        const uiTree = await generateUI({
          intent,
          messages,
          model,
        });

        return {
          success: true,
          type: "generative-ui" as const,
          ui: uiTree,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "UI generation failed",
        };
      }
    },
  });
}
