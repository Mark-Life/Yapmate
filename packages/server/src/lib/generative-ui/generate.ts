/**
 * UI generation using JSONL patch streaming
 * Generates structured UI via incremental JSON patches
 */

import { streamText } from 'ai'
import { openrouter } from '../openrouter'
import { uiCatalog } from './catalog'
import {
  type JsonPatch,
  type UITree,
  EMPTY_TREE,
  applyPatch,
  parsePatchLine,
} from '@yapmate/core/generative-ui'
import type { UIGenerationContext } from './types'

/** Formats a message part for the UI generation agent */
const formatMessagePart = (part: { type: string; [key: string]: unknown }) => {
  if (part.type === 'text' && 'text' in part) {
    return part.text as string
  }
  if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
    const toolPart = part as {
      toolName?: string
      input?: unknown
      output?: unknown
    }
    const lines: string[] = []
    lines.push(`[Tool: ${toolPart.toolName ?? 'unknown'}]`)
    if (toolPart.input) {
      lines.push(`Input: ${JSON.stringify(toolPart.input, null, 2)}`)
    }
    if (toolPart.output) {
      lines.push(`Output: ${JSON.stringify(toolPart.output, null, 2)}`)
    }
    return lines.join('\n')
  }
  if (part.type === 'file') {
    const mediaType = part.mediaType as string | undefined
    const filename = part.filename as string | undefined
    return `[File: ${filename ?? mediaType ?? 'unknown'}]`
  }
  return ''
}

/** Formats a message for the UI generation agent */
const formatMessageForUIAgent = (message: {
  role: string
  parts: Array<{ type: string; [key: string]: unknown }>
}) => {
  const content = message.parts.map(formatMessagePart).filter(Boolean).join('\n\n')
  return content
}

/** Context for streaming UI generation */
export type StreamUIContext = UIGenerationContext & {
  /** Callback for each patch applied */
  onPatch?: (patch: JsonPatch, tree: UITree) => void
}

/**
 * Streams UI generation using JSONL patches
 * Yields patches as they are parsed from the LLM output
 */
export async function* streamUIPatches(
  context: StreamUIContext
): AsyncGenerator<{ patch: JsonPatch; tree: UITree }, UITree, unknown> {
  const { intent, messages, model, abortSignal, onPatch } = context

  const formattedMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: formatMessageForUIAgent(m),
  }))

  if (intent) {
    formattedMessages.push({
      role: 'user',
      content: `Generate UI for: ${intent}`,
    })
  }

  console.log('[streamUIPatches] Starting with model:', model)
  console.log('[streamUIPatches] Intent:', intent)

  const systemPrompt = uiCatalog.generatePrompt()

  const result = streamText({
    model: openrouter.chat(model),
    system: systemPrompt,
    messages: formattedMessages,
    abortSignal,
  })

  let tree: UITree = { ...EMPTY_TREE }
  let buffer = ''

  for await (const chunk of result.textStream) {
    buffer += chunk

    // Process complete lines
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const patch = parsePatchLine(line)
      if (patch) {
        tree = applyPatch(tree, patch)
        console.log('[streamUIPatches] Applied patch:', JSON.stringify(patch))
        onPatch?.(patch, tree)
        yield { patch, tree }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const patch = parsePatchLine(buffer)
    if (patch) {
      tree = applyPatch(tree, patch)
      console.log('[streamUIPatches] Applied final patch:', JSON.stringify(patch))
      onPatch?.(patch, tree)
      yield { patch, tree }
    }
  }

  console.log('[streamUIPatches] Final tree:', JSON.stringify(tree, null, 2))
  return tree
}

/**
 * Legacy streaming interface for backwards compatibility
 * Yields partial trees (built from patches)
 */
export async function* streamUI(
  context: StreamUIContext
): AsyncGenerator<Partial<UITree>, UITree, unknown> {
  const generator = streamUIPatches(context)

  let result = await generator.next()
  while (!result.done) {
    yield result.value.tree
    result = await generator.next()
  }

  return result.value
}

/**
 * Non-streaming generation - returns complete tree
 */
export async function generateUI(context: StreamUIContext): Promise<UITree> {
  const generator = streamUIPatches(context)

  let finalTree: UITree = { ...EMPTY_TREE }
  let result = await generator.next()

  while (!result.done) {
    finalTree = result.value.tree
    result = await generator.next()
  }

  return result.value
}
