import type {
  CachedModelsData,
  ModelMetadata,
  ModelsDevApiResponse,
} from "./models-types";

const API_URL = "https://models.dev/api.json";
const CACHE_FILE = ".cache/models.json";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
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
 * Reads cached models from filesystem
 */
const readCacheFile = async (): Promise<CachedModelsData | null> => {
  try {
    const file = Bun.file(CACHE_FILE);
    if (!(await file.exists())) {
      return null;
    }

    const content = await file.json();
    return content as CachedModelsData;
  } catch {
    return null;
  }
};

/**
 * Writes models cache to filesystem
 */
const writeCacheFile = async (
  models: Record<string, ModelMetadata>
): Promise<void> => {
  try {
    const cacheData: CachedModelsData = {
      timestamp: Date.now(),
      ttl: TTL_MS,
      models,
    };
    // Bun.write will create directories automatically
    await Bun.write(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch {
    // Silently fail - filesystem cache is optional
  }
};

/**
 * Checks if cached data is still valid (within TTL)
 */
const isCacheValid = (cache: CachedModelsData): boolean => {
  const age = Date.now() - cache.timestamp;
  return age < cache.ttl;
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
 * Fetches models from API or cache
 * Returns null if fetch fails and no valid cache exists
 */
export const fetchModels = async (): Promise<Record<
  string,
  ModelMetadata
> | null> => {
  // Try to read from filesystem cache first
  const cached = await readCacheFile();
  if (cached && isCacheValid(cached)) {
    return cached.models;
  }

  // Fetch from API
  try {
    const models = await fetchFromApi();
    // Save to cache (non-blocking)
    writeCacheFile(models).catch(() => {
      // Silently fail
    });
    return models;
  } catch {
    // If API fails, return stale cache if available
    if (cached) {
      return cached.models;
    }
    return null;
  }
};

/**
 * Gets the cache file path (for testing/debugging)
 */
export const getCacheFilePath = (): string => CACHE_FILE;
