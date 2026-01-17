/**
 * Visibility condition evaluation for conditional rendering
 */

import { getByPath } from './path'
import type { VisibilityCondition } from './types'

/**
 * Context for visibility evaluation
 */
export type VisibilityContext = {
  data: Record<string, unknown>
  auth?: { signedIn: boolean }
}

/**
 * Type guards for visibility conditions
 */
function isPathCondition(c: VisibilityCondition): c is { path: string } {
  return typeof c === 'object' && 'path' in c && !('eq' in c) && !('neq' in c) && !('gt' in c) && !('gte' in c) && !('lt' in c) && !('lte' in c)
}

function isEqCondition(c: VisibilityCondition): c is { path: string; eq: unknown } {
  return typeof c === 'object' && 'path' in c && 'eq' in c
}

function isNeqCondition(c: VisibilityCondition): c is { path: string; neq: unknown } {
  return typeof c === 'object' && 'path' in c && 'neq' in c
}

function isGtCondition(c: VisibilityCondition): c is { path: string; gt: number } {
  return typeof c === 'object' && 'path' in c && 'gt' in c
}

function isGteCondition(c: VisibilityCondition): c is { path: string; gte: number } {
  return typeof c === 'object' && 'path' in c && 'gte' in c
}

function isLtCondition(c: VisibilityCondition): c is { path: string; lt: number } {
  return typeof c === 'object' && 'path' in c && 'lt' in c
}

function isLteCondition(c: VisibilityCondition): c is { path: string; lte: number } {
  return typeof c === 'object' && 'path' in c && 'lte' in c
}

function isAuthCondition(c: VisibilityCondition): c is { auth: 'signedIn' | 'signedOut' } {
  return typeof c === 'object' && 'auth' in c
}

function isAndCondition(c: VisibilityCondition): c is { and: VisibilityCondition[] } {
  return typeof c === 'object' && 'and' in c
}

function isOrCondition(c: VisibilityCondition): c is { or: VisibilityCondition[] } {
  return typeof c === 'object' && 'or' in c
}

function isNotCondition(c: VisibilityCondition): c is { not: VisibilityCondition } {
  return typeof c === 'object' && 'not' in c
}

/**
 * Evaluate a visibility condition
 * @returns true if element should be visible
 */
export function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  ctx: VisibilityContext
): boolean {
  if (condition === undefined) return true
  if (typeof condition === 'boolean') return condition

  if (isPathCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return Boolean(value)
  }

  if (isEqCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return value === condition.eq
  }

  if (isNeqCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return value !== condition.neq
  }

  if (isGtCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return typeof value === 'number' && value > condition.gt
  }

  if (isGteCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return typeof value === 'number' && value >= condition.gte
  }

  if (isLtCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return typeof value === 'number' && value < condition.lt
  }

  if (isLteCondition(condition)) {
    const value = getByPath(ctx.data, condition.path)
    return typeof value === 'number' && value <= condition.lte
  }

  if (isAuthCondition(condition)) {
    const signedIn = ctx.auth?.signedIn ?? false
    return condition.auth === 'signedIn' ? signedIn : !signedIn
  }

  if (isAndCondition(condition)) {
    return condition.and.every(c => evaluateVisibility(c, ctx))
  }

  if (isOrCondition(condition)) {
    return condition.or.some(c => evaluateVisibility(c, ctx))
  }

  if (isNotCondition(condition)) {
    return !evaluateVisibility(condition.not, ctx)
  }

  return true
}

/**
 * Create a simple path-based visibility condition
 */
export function visibleWhen(path: string): VisibilityCondition {
  return { path }
}

/**
 * Create an equality visibility condition
 */
export function visibleWhenEquals(path: string, value: unknown): VisibilityCondition {
  return { path, eq: value }
}

/**
 * Create a compound AND visibility condition
 */
export function visibleWhenAll(...conditions: VisibilityCondition[]): VisibilityCondition {
  return { and: conditions }
}

/**
 * Create a compound OR visibility condition
 */
export function visibleWhenAny(...conditions: VisibilityCondition[]): VisibilityCondition {
  return { or: conditions }
}

/**
 * Negate a visibility condition
 */
export function visibleWhenNot(condition: VisibilityCondition): VisibilityCondition {
  return { not: condition }
}
