import { fetchModels } from "./fetcher";
import { MODELS } from "./models";
import type { ModelId, ModelMetadata } from "./types";

/**
 * Gets all available model IDs
 * Fetches from API, falls back to hardcoded MODELS if fetch fails
 */
export const getModels = async (): Promise<readonly ModelId[]> => {
  const models = await fetchModels();
  if (models) {
    return Object.keys(models) as readonly ModelId[];
  }

  // Fallback to hardcoded models
  return MODELS;
};

/**
 * Gets metadata for a specific model
 * Returns undefined if model not found
 */
export const getModelMetadata = async (
  modelId: ModelId
): Promise<ModelMetadata | undefined> => {
  const models = await fetchModels();
  return models?.[modelId];
};

/**
 * Gets all models with their metadata
 * Fetches from API, returns empty object if fetch fails
 */
export const getAllModelsMetadata = async (): Promise<
  Record<string, ModelMetadata>
> => {
  const models = await fetchModels();
  return models ?? {};
};
