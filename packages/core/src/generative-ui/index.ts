/**
 * Generative UI Core Module
 * Flat element structure optimized for LLM streaming
 */

// Types
export {
  type DynamicValue,
  type VisibilityCondition,
  type ActionCallback,
  type ActionConfirm,
  type Action,
  type UIElement,
  type UITree,
  EMPTY_TREE,
  isDynamicPath,
  isDynamicTemplate,
  isStaticValue,
} from './types'

// Path utilities
export {
  parsePath,
  getByPath,
  setByPath,
  deleteByPath,
  hasPath,
  interpolateTemplate,
  resolveDynamicValue,
  resolveAllDynamicValues,
} from './path'

// Visibility evaluation
export {
  type VisibilityContext,
  evaluateVisibility,
  visibleWhen,
  visibleWhenEquals,
  visibleWhenAll,
  visibleWhenAny,
  visibleWhenNot,
} from './visibility'

// Patches
export {
  type JsonPatch,
  isSetRootPatch,
  isAddPatch,
  isReplacePatch,
  isRemovePatch,
  extractElementKey,
  applyPatch,
  applyPatches,
  parsePatchLine,
  parsePatchLines,
  setRoot,
  addElement,
  replaceProp,
  removeElement,
  createPatchAccumulator,
} from './patches'
