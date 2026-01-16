/**
 * Generative UI module
 * Exports catalog, tool, and generation functions
 */

export { uiCatalog, type UICatalog } from "./catalog";
export { generateUI, generateUIStream } from "./generate";
export { createRenderUiTool, type RenderUiToolInput } from "./tool";
export type {
  GenerativeUIPart,
  GenerativeUIStreamChunk,
  UIGenerationContext,
  UIGenerationResult,
} from "./types";
