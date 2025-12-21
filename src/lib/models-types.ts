/**
 * Types for models.dev API response and cached data structures
 */

/**
 * Model cost information
 */
export type ModelCost = {
  input: number;
  output: number;
  reasoning?: number;
  cache_read?: number;
  cache_write?: number;
  input_audio?: number;
  output_audio?: number;
};

/**
 * Model context and output limits
 */
export type ModelLimit = {
  context: number;
  input?: number;
  output: number;
};

/**
 * Model input/output modalities
 */
export type ModelModalities = {
  input: string[];
  output: string[];
};

/**
 * Interleaved reasoning configuration
 */
export type ModelInterleaved = {
  field: "reasoning_content" | "reasoning_details";
};

/**
 * Complete model metadata from models.dev
 */
export type ModelMetadata = {
  id: string;
  name: string;
  family: string;
  attachment: boolean;
  reasoning: boolean;
  tool_call: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date: string;
  last_updated: string;
  open_weights: boolean;
  interleaved?: boolean | ModelInterleaved;
  cost: ModelCost;
  limit: ModelLimit;
  modalities: ModelModalities;
  status?: "alpha" | "beta" | "deprecated";
};

/**
 * Provider metadata from models.dev
 */
export type ProviderMetadata = {
  id: string;
  name: string;
  npm: string;
  env: string[];
  doc: string;
  api?: string;
  models: Record<string, ModelMetadata>;
};

/**
 * Models.dev API response structure
 */
export type ModelsDevApiResponse = Record<string, ProviderMetadata>;

/**
 * Cached models data structure
 */
export type CachedModelsData = {
  timestamp: number;
  ttl: number;
  models: Record<string, ModelMetadata>;
};

/**
 * Model ID format (lowercase provider/model-name)
 */
export type ModelId = string;
