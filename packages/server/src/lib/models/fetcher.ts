import type { ModelMetadata, ModelsDevApiResponse } from "@yapmate/core/types";

const API_URL = "https://models.dev/api.json";
const API_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Transforms model ID from API format (e.g., "OPENAI/GPT-5") to lowercase format (e.g., "openai/gpt-5")
 */
const normalizeModelId = (modelId: string): string => modelId.toLowerCase();

/**
 * Extracts OpenRouter models from API response and transforms them
 */
const extractOpenRouterModels = (
  apiResponse: ModelsDevApiResponse
): Record<string, ModelMetadata> => {
  const openrouterProvider = apiResponse.openrouter;
  if (!openrouterProvider?.models) {
    return {};
  }

  const transformed: Record<string, ModelMetadata> = {};
  for (const [modelId, modelData] of Object.entries(
    openrouterProvider.models
  )) {
    const normalizedId = normalizeModelId(modelId);
    transformed[normalizedId] = {
      ...modelData,
      id: normalizedId,
    };
  }

  return transformed;
};

/**
 * Fetches models from models.dev API with timeout
 */
const fetchFromApi = async (): Promise<Record<string, ModelMetadata>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as ModelsDevApiResponse;
    return extractOpenRouterModels(data);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fetches models from models.dev API
 * Returns null if fetch fails
 */
export const fetchModels = async (): Promise<Record<
  string,
  ModelMetadata
> | null> => {
  try {
    return await fetchFromApi();
  } catch {
    return null;
  }
};
