/**
 * JSON Pointer (RFC 6901) path utilities for data binding
 */

import { isDynamicPath, isDynamicTemplate, type DynamicValue } from './types'

/**
 * Parse JSON Pointer path into segments
 * @example parsePath('/a/b/0') → ['a', 'b', '0']
 */
export function parsePath(path: string): string[] {
  if (path === '' || path === '/') return []
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return normalized.split('/').map(segment =>
    segment.replace(/~1/g, '/').replace(/~0/g, '~')
  )
}

/**
 * Get value at JSON Pointer path
 * @example getByPath({ a: { b: 1 } }, '/a/b') → 1
 */
export function getByPath(obj: unknown, path: string): unknown {
  const segments = parsePath(path)
  if (segments.length === 0) return obj

  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined

    if (typeof current !== 'object') return undefined

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10)
      if (Number.isNaN(index)) return undefined
      current = current[index]
    } else {
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return current
}

/**
 * Set value at JSON Pointer path (immutable)
 * Creates intermediate objects/arrays as needed
 * @example setByPath({ a: 1 }, '/b/c', 2) → { a: 1, b: { c: 2 } }
 */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const segments = parsePath(path)
  if (segments.length === 0) return value as T

  const result = structuredClone(obj) as Record<string, unknown>
  let current = result

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]
    const nextIsIndex = /^\d+$/.test(nextSegment)

    if (!(segment in current) || current[segment] === null || current[segment] === undefined) {
      current[segment] = nextIsIndex ? [] : {}
    }

    current = current[segment] as Record<string, unknown>
  }

  const lastSegment = segments[segments.length - 1]
  current[lastSegment] = value

  return result as T
}

/**
 * Delete value at JSON Pointer path (immutable)
 */
export function deleteByPath<T>(obj: T, path: string): T {
  const segments = parsePath(path)
  if (segments.length === 0) return {} as T

  const result = structuredClone(obj) as Record<string, unknown>
  let current = result

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (!(segment in current) || typeof current[segment] !== 'object') {
      return result as T
    }
    current = current[segment] as Record<string, unknown>
  }

  const lastSegment = segments[segments.length - 1]
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10)
    if (!Number.isNaN(index)) {
      current.splice(index, 1)
    }
  } else {
    delete current[lastSegment]
  }

  return result as T
}

/**
 * Check if path exists in object
 */
export function hasPath(obj: unknown, path: string): boolean {
  const segments = parsePath(path)
  if (segments.length === 0) return true

  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false
    }

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10)
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        return false
      }
      current = current[index]
    } else {
      if (!(segment in current)) return false
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return true
}

/**
 * Interpolate template string with data paths
 * @example interpolateTemplate("Hello {/user/name}!", { user: { name: "John" } }) → "Hello John!"
 */
export function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (_, path: string) => {
    const value = getByPath(data, path)
    if (value === null || value === undefined) return ''
    return String(value)
  })
}

/**
 * Resolve DynamicValue against data context
 */
export function resolveDynamicValue<T>(
  value: DynamicValue<T>,
  data: Record<string, unknown>
): T {
  if (isDynamicPath(value)) {
    return getByPath(data, value.path) as T
  }

  if (isDynamicTemplate(value)) {
    return interpolateTemplate(value.template, data) as T
  }

  return value as T
}

/**
 * Resolve all DynamicValues in an object recursively
 */
export function resolveAllDynamicValues<T extends Record<string, unknown>>(
  obj: T,
  data: Record<string, unknown>
): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value
    } else if (isDynamicPath(value) || isDynamicTemplate(value)) {
      result[key] = resolveDynamicValue(value, data)
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? resolveAllDynamicValues(item as Record<string, unknown>, data)
          : item
      )
    } else if (typeof value === 'object') {
      result[key] = resolveAllDynamicValues(value as Record<string, unknown>, data)
    } else {
      result[key] = value
    }
  }

  return result as T
}
