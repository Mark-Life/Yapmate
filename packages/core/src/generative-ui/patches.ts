/**
 * JSON Patch operations for streaming UI updates
 * Based on RFC 6902 with modifications for UITree
 */

import { setByPath, deleteByPath } from './path'
import { EMPTY_TREE, type UIElement, type UITree } from './types'

/**
 * Patch operation types
 */
export type JsonPatch =
  | { op: 'set'; path: '/root'; value: string }
  | { op: 'add'; path: string; value: UIElement }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string }

/**
 * Type guards for patch operations
 */
export function isSetRootPatch(patch: JsonPatch): patch is { op: 'set'; path: '/root'; value: string } {
  return patch.op === 'set' && patch.path === '/root'
}

export function isAddPatch(patch: JsonPatch): patch is { op: 'add'; path: string; value: UIElement } {
  return patch.op === 'add'
}

export function isReplacePatch(patch: JsonPatch): patch is { op: 'replace'; path: string; value: unknown } {
  return patch.op === 'replace'
}

export function isRemovePatch(patch: JsonPatch): patch is { op: 'remove'; path: string } {
  return patch.op === 'remove'
}

/**
 * Extract element key from patch path
 * @example extractElementKey('/elements/card-1') → 'card-1'
 */
export function extractElementKey(path: string): string | null {
  const match = path.match(/^\/elements\/([^/]+)/)
  return match ? match[1] : null
}

/**
 * Apply a single patch to a UITree (immutable)
 */
export function applyPatch(tree: UITree, patch: JsonPatch): UITree {
  switch (patch.op) {
    case 'set': {
      if (patch.path === '/root') {
        return { ...tree, root: patch.value }
      }
      return tree
    }

    case 'add': {
      const key = extractElementKey(patch.path)
      if (key) {
        return {
          ...tree,
          elements: { ...tree.elements, [key]: patch.value }
        }
      }
      return tree
    }

    case 'replace': {
      return setByPath(tree, patch.path, patch.value)
    }

    case 'remove': {
      const key = extractElementKey(patch.path)
      if (key) {
        const { [key]: _, ...rest } = tree.elements
        return { ...tree, elements: rest }
      }
      return deleteByPath(tree, patch.path)
    }

    default:
      return tree
  }
}

/**
 * Apply multiple patches to a UITree
 */
export function applyPatches(tree: UITree, patches: JsonPatch[]): UITree {
  return patches.reduce(applyPatch, tree)
}

/**
 * Parse a JSONL line into a patch
 * Returns null if invalid
 */
export function parsePatchLine(line: string): JsonPatch | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)

    if (typeof parsed !== 'object' || parsed === null) return null
    if (!('op' in parsed) || !('path' in parsed)) return null

    const { op, path, value } = parsed

    if (op === 'set' && path === '/root' && typeof value === 'string') {
      return { op: 'set', path: '/root', value }
    }

    if (op === 'add' && typeof path === 'string' && path.startsWith('/elements/') && value) {
      return { op: 'add', path, value }
    }

    if (op === 'replace' && typeof path === 'string') {
      return { op: 'replace', path, value }
    }

    if (op === 'remove' && typeof path === 'string') {
      return { op: 'remove', path }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse multiple JSONL lines into patches
 */
export function parsePatchLines(text: string): JsonPatch[] {
  return text
    .split('\n')
    .map(parsePatchLine)
    .filter((p): p is JsonPatch => p !== null)
}

/**
 * Create a set root patch
 */
export function setRoot(key: string): JsonPatch {
  return { op: 'set', path: '/root', value: key }
}

/**
 * Create an add element patch
 */
export function addElement(element: UIElement): JsonPatch {
  return { op: 'add', path: `/elements/${element.key}`, value: element }
}

/**
 * Create a replace patch
 */
export function replaceProp(elementKey: string, propPath: string, value: unknown): JsonPatch {
  return { op: 'replace', path: `/elements/${elementKey}/props/${propPath}`, value }
}

/**
 * Create a remove element patch
 */
export function removeElement(key: string): JsonPatch {
  return { op: 'remove', path: `/elements/${key}` }
}

/**
 * Streaming patch accumulator
 * Handles partial lines across chunks
 */
export function createPatchAccumulator() {
  let buffer = ''
  let tree: UITree = EMPTY_TREE

  return {
    /** Process a text chunk, returns new patches found */
    process(chunk: string): JsonPatch[] {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      const patches: JsonPatch[] = []

      for (const line of lines) {
        const patch = parsePatchLine(line)
        if (patch) {
          tree = applyPatch(tree, patch)
          patches.push(patch)
        }
      }

      return patches
    },

    /** Flush remaining buffer, returns any final patches */
    flush(): JsonPatch[] {
      if (!buffer.trim()) return []

      const patch = parsePatchLine(buffer)
      buffer = ''

      if (patch) {
        tree = applyPatch(tree, patch)
        return [patch]
      }

      return []
    },

    /** Get current tree state */
    getTree(): UITree {
      return tree
    },

    /** Reset accumulator */
    reset(): void {
      buffer = ''
      tree = EMPTY_TREE
    }
  }
}
