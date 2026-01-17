/**
 * Generative UI Core Types
 * Flat element structure optimized for LLM streaming
 */

/**
 * Dynamic value that can be resolved at runtime
 * - Static value: used as-is
 * - Path: resolved from data context via JSON Pointer
 * - Template: string interpolation with paths
 */
export type DynamicValue<T = unknown> =
  | T
  | { path: string }
  | { template: string }

/**
 * Visibility condition for conditional rendering
 */
export type VisibilityCondition =
  | boolean
  | { path: string }
  | { path: string; eq: unknown }
  | { path: string; neq: unknown }
  | { path: string; gt: number }
  | { path: string; gte: number }
  | { path: string; lt: number }
  | { path: string; lte: number }
  | { auth: 'signedIn' | 'signedOut' }
  | { and: VisibilityCondition[] }
  | { or: VisibilityCondition[] }
  | { not: VisibilityCondition }

/**
 * Action callback executed after action success/failure
 */
export type ActionCallback =
  | { navigate: string }
  | { set: { path: string; value: DynamicValue } }
  | { action: Action }

/**
 * Confirmation dialog config for actions
 */
export type ActionConfirm = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Action triggered by user interaction
 */
export type Action = {
  name: string
  params?: Record<string, DynamicValue>
  confirm?: ActionConfirm
  onSuccess?: ActionCallback
  onError?: ActionCallback
}

/**
 * Single UI element with flat structure
 * Children referenced by key strings, not nested objects
 */
export type UIElement<P = Record<string, unknown>> = {
  key: string
  type: string
  props: P
  children?: string[]
  visible?: VisibilityCondition
}

/**
 * Complete UI tree with flat element map
 */
export type UITree = {
  root: string
  elements: Record<string, UIElement>
}

/**
 * Empty tree constant
 */
export const EMPTY_TREE: UITree = { root: '', elements: {} }

/**
 * Type guard for DynamicValue with path
 */
export function isDynamicPath(value: unknown): value is { path: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'path' in value &&
    typeof (value as { path: unknown }).path === 'string'
  )
}

/**
 * Type guard for DynamicValue with template
 */
export function isDynamicTemplate(value: unknown): value is { template: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'template' in value &&
    typeof (value as { template: unknown }).template === 'string'
  )
}

/**
 * Type guard for static value (not dynamic)
 */
export function isStaticValue<T>(value: DynamicValue<T>): value is T {
  return !isDynamicPath(value) && !isDynamicTemplate(value)
}
