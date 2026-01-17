/**
 * Type definitions for generative UI
 */

import type { UITree, JsonPatch } from '@yapmate/core/generative-ui'
import type { UIMessage } from 'ai'

// Re-export core types for convenience
export type { UITree, UIElement, JsonPatch, DynamicValue, VisibilityCondition, Action } from '@yapmate/core/generative-ui'

/** Context passed to the UI generation agent */
export type UIGenerationContext = {
  /** Optional intent from render_ui tool */
  intent?: string
  /** Full conversation history */
  messages: UIMessage[]
  /** Model ID to use (same as user's selected model) */
  model: string
  /** Optional data context for data binding */
  data?: Record<string, unknown>
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal
}

/** Result of UI generation */
export type UIGenerationResult = {
  /** Generated UI tree */
  tree: UITree
  /** Generation metadata */
  metadata?: {
    tokensUsed?: number
    modelUsed?: string
  }
}

/** Stream chunk types for generative UI */
export type GenerativeUIStreamChunk =
  | { type: 'ui-start'; id: string }
  | { type: 'ui-patch'; id: string; patch: JsonPatch }
  | { type: 'ui-end'; id: string; tree: UITree }
  | { type: 'ui-error'; id: string; error: string }

/** Chunk emitter for streaming UI generation */
export type ChunkEmitter = {
  emit: (chunk: GenerativeUIStreamChunk) => void | Promise<void>
}

/** Generative UI part for message parts */
export type GenerativeUIPart = {
  type: 'generative-ui'
  id: string
  ui: UITree
}
