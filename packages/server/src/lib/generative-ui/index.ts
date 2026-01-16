/**
 * Generative UI module
 * Exports catalog, tool, and generation functions
 */

export { type UICatalog, uiCatalog } from "./catalog";
export { type StreamUIContext, streamUI } from "./generate";
export {
  type CreateRenderUiToolOptions,
  createRenderUiTool,
  type RenderUiToolInput,
} from "./tool";
export type {
  ChunkEmitter,
  GenerativeUIPart,
  GenerativeUIStreamChunk,
  UIGenerationContext,
  UIGenerationResult,
} from "./types";
