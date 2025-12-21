import { MODELS } from "./models";
import { fetchModels } from "./models-fetcher";
import type { ModelId, ModelMetadata } from "./models-types";

/**
 * In-memory cache for models
 */
type MemoryCache = {
  models: Record<string, ModelMetadata>;
  timestamp: number;
  ttl: number;
};

let memoryCache: MemoryCache | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks if memory cache is valid
 */
const isMemoryCacheValid = (cache: MemoryCache): boolean => {
  const age = Date.now() - cache.timestamp;
  return age < cache.ttl;
};

/**
 * Refreshes models in background (non-blocking)
 */
const refreshInBackground = async (): Promise<void> => {
  try {
    const models = await fetchModels();
    if (models) {
      memoryCache = {
        models,
        timestamp: Date.now(),
        ttl: TTL_MS,
      };
    }
  } catch {
    // Silently fail - background refresh shouldn't break the app
  }
};

/**
 * Gets all available model IDs
 * Returns cached models if available, otherwise fetches from API
 * Falls back to hardcoded MODELS if fetch fails
 */
export const getModels = async (): Promise<readonly ModelId[]> => {
  // Check memory cache first
  if (memoryCache && isMemoryCacheValid(memoryCache)) {
    return Object.keys(memoryCache.models) as readonly ModelId[];
  }

  // If cache expired, serve stale data and refresh in background
  if (memoryCache) {
    refreshInBackground().catch(() => {
      // Silently fail
    });
    return Object.keys(memoryCache.models) as readonly ModelId[];
  }

  // No cache, fetch synchronously
  const models = await fetchModels();
  if (models) {
    memoryCache = {
      models,
      timestamp: Date.now(),
      ttl: TTL_MS,
    };
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
  // Ensure cache is populated
  if (memoryCache === null || !isMemoryCacheValid(memoryCache)) {
    const models = await fetchModels();
    if (models) {
      memoryCache = {
        models,
        timestamp: Date.now(),
        ttl: TTL_MS,
      };
    } else if (memoryCache === null) {
      // No cache and fetch failed - can't provide metadata
      return;
    }
  }

  return memoryCache?.models[modelId];
};

/**
 * Gets all models with their metadata
 * Returns cached models if available, otherwise fetches from API
 * Falls back to empty object if fetch fails
 */
export const getAllModelsMetadata = async (): Promise<
  Record<string, ModelMetadata>
> => {
  // Ensure cache is populated
  if (memoryCache === null || !isMemoryCacheValid(memoryCache)) {
    const models = await fetchModels();
    if (models) {
      memoryCache = {
        models,
        timestamp: Date.now(),
        ttl: TTL_MS,
      };
    } else if (memoryCache === null) {
      // No cache and fetch failed
      return {};
    }
  }

  return memoryCache?.models ?? {};
};

/**
 * Pre-warms the cache (useful for build time or app startup)
 */
export const prewarmCache = async (): Promise<void> => {
  const models = await fetchModels();
  if (models) {
    memoryCache = {
      models,
      timestamp: Date.now(),
      ttl: TTL_MS,
    };
  }
};
