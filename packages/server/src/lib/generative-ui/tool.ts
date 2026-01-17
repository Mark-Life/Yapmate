/**
 * render_ui tool definition
 * Allows the main agent to trigger UI generation with streaming
 */

import type { UIMessage } from 'ai'
import { tool } from 'ai'
import { z } from 'zod'
import { streamUIPatches } from './generate'
import type { ChunkEmitter, UITree } from './types'

const renderUiInputSchema = z.object({
  intent: z
    .string()
    .describe(
      'What to render: "table of results", "analytics dashboard", "summary metrics", "flashcards for learning", etc.'
    ),
})

export type RenderUiToolInput = z.infer<typeof renderUiInputSchema>

/** Generate a unique ID for UI elements */
const generateUiId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Options for creating the render_ui tool */
export type CreateRenderUiToolOptions = {
  messages: UIMessage[]
  model: string
  chunkEmitter?: ChunkEmitter
  abortSignal?: AbortSignal
}

/**
 * Creates the render_ui tool with access to conversation context and streaming
 */
export function createRenderUiTool(options: CreateRenderUiToolOptions) {
  const { messages, model, chunkEmitter, abortSignal } = options

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
      const id = generateUiId()

      try {
        if (chunkEmitter) {
          await chunkEmitter.emit({ type: 'ui-start', id })
        }

        const generator = streamUIPatches({
          intent,
          messages,
          model,
          abortSignal,
        })

        let finalTree: UITree | null = null

        let result = await generator.next()
        while (!result.done) {
          const { patch, tree } = result.value
          finalTree = tree

          // Emit each patch as it arrives
          if (chunkEmitter) {
            await chunkEmitter.emit({
              type: 'ui-patch',
              id,
              patch,
            })
          }

          result = await generator.next()
        }

        // Generator return value is the final tree
        finalTree = result.value

        if (!finalTree?.root || !finalTree?.elements || Object.keys(finalTree.elements).length === 0) {
          throw new Error('UI generation completed without producing elements')
        }

        if (chunkEmitter) {
          await chunkEmitter.emit({
            type: 'ui-end',
            id,
            tree: finalTree,
          })
        }

        return {
          success: true,
          type: 'generative-ui' as const,
          uiId: id,
          ui: finalTree,
        }
      } catch (error) {
        if (chunkEmitter) {
          await chunkEmitter.emit({
            type: 'ui-error',
            id,
            error: error instanceof Error ? error.message : 'UI generation failed',
          })
        }

        return {
          success: false,
          uiId: id,
          error: error instanceof Error ? error.message : 'UI generation failed',
        }
      }
    },
  })
}
