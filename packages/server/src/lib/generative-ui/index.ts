/**
 * Generative UI module
 * Exports catalog, tool, and generation functions
 */

// Catalog builder
export {
  createCatalog,
  defineComponent,
  defineAction,
  type Catalog,
  type CatalogConfig,
  type ComponentDefinition,
  type ActionDefinition,
  type SafeParseResult,
} from './catalog-builder'

// Default catalog instance
export { type UICatalog, uiCatalog } from './catalog'

// Generation
export {
  type StreamUIContext,
  streamUI,
  streamUIPatches,
  generateUI,
} from './generate'

// Tool
export {
  type CreateRenderUiToolOptions,
  createRenderUiTool,
  type RenderUiToolInput,
} from './tool'

// Types
export type {
  ChunkEmitter,
  GenerativeUIPart,
  GenerativeUIStreamChunk,
  UIGenerationContext,
  UIGenerationResult,
} from './types'

// Re-export core types
export type {
  UITree,
  UIElement,
  JsonPatch,
  DynamicValue,
  VisibilityCondition,
  Action,
} from './types'
