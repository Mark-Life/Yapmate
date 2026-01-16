/**
 * Types for AI models (sourced from OpenRouter API)
 */

/**
 * Model cost information (per token pricing)
 */
export type ModelCost = {
  input: number;
  output: number;
  reasoning?: number;
  cacheRead?: number;
  cacheWrite?: number;
};

/**
 * Model context and token limits
 */
export type ModelLimit = {
  context: number | null;
  input: number;
  output: number;
};

/**
 * Internal model metadata used throughout the app
 * Normalized from OpenRouter API response
 */
export type ModelMetadata = {
  id: string;
  name: string;
  description?: string;
  contextLength: number | null;
  inputLimit: number;
  outputLimit: number;
  cost: ModelCost;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsReasoning: boolean;
};

/**
 * Model ID format (lowercase provider/model-name)
 */
export type ModelId = string;

// ─── UI Message Types ────────────────────────────────────────────────────────

/**
 * Custom data part types extending AI SDK's UIMessage
 */
export type CustomDataParts = {
  "chat-title": {
    title: string;
  };
  "generative-ui": {
    id: string;
    ui: unknown;
  };
};
