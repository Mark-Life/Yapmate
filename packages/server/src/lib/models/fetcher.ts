import { OpenRouter } from "@openrouter/sdk";
import type { Model } from "@openrouter/sdk/models/model.js";
import type { ModelMetadata } from "@yapmate/core/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** In-memory cache for models */
let modelsCache: Record<string, ModelMetadata> | null = null;
let cacheTimestamp = 0;

/**
 * Creates OpenRouter SDK client
 */
const createClient = () =>
  new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
  });

/**
 * Checks if model supports text output (filters out image-only models)
 */
const supportsTextOutput = (model: Model): boolean =>
  model.architecture.outputModalities.includes("text");

/**
 * Converts OpenRouter pricing string to number
 * OpenRouter returns pricing as string (e.g., "0.00025")
 */
const parsePrice = (price: string | undefined): number =>
  price ? Number.parseFloat(price) : 0;

/**
 * Checks if model supports a specific parameter
 */
const supportsParam = (model: Model, param: string): boolean =>
  model.supportedParameters?.includes(param as never) ?? false;

/**
 * Transforms OpenRouter Model to internal ModelMetadata
 */
const transformModel = (model: Model): ModelMetadata => ({
  id: model.id,
  name: model.name,
  description: model.description,
  contextLength: model.contextLength ?? null,
  inputLimit: model.perRequestLimits?.promptTokens ?? 0,
  outputLimit: model.perRequestLimits?.completionTokens ?? 0,
  cost: {
    input: parsePrice(model.pricing.prompt),
    output: parsePrice(model.pricing.completion),
    reasoning: parsePrice(model.pricing.internalReasoning),
    cacheRead: parsePrice(model.pricing.inputCacheRead),
    cacheWrite: parsePrice(model.pricing.inputCacheWrite),
  },
  supportsTools: supportsParam(model, "tools"),
  supportsStructuredOutput: supportsParam(model, "structured_outputs"),
  supportsReasoning:
    supportsParam(model, "reasoning") ||
    supportsParam(model, "include_reasoning"),
});

/**
 * Fetches models from OpenRouter API using SDK
 */
const fetchFromApi = async (): Promise<Record<string, ModelMetadata>> => {
  const client = createClient();
  const response = await client.models.list({});

  const transformed: Record<string, ModelMetadata> = {};

  for (const model of response.data) {
    // Only include models that support text output
    if (supportsTextOutput(model)) {
      transformed[model.id] = transformModel(model);
    }
  }

  return transformed;
};

/**
 * Checks if cache is valid (exists and not expired)
 */
const isCacheValid = (): boolean =>
  modelsCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;

/**
 * Fetches models from OpenRouter API with caching
 * Returns null if fetch fails
 */
export const fetchModels = async (): Promise<Record<
  string,
  ModelMetadata
> | null> => {
  // Return cached data if valid
  if (isCacheValid()) {
    return modelsCache;
  }

  try {
    const models = await fetchFromApi();
    modelsCache = models;
    cacheTimestamp = Date.now();
    return models;
  } catch (error) {
    console.error("Failed to fetch models from OpenRouter:", error);
    // Return stale cache if available, otherwise null
    return modelsCache;
  }
};

/**
 * Clears the models cache (useful for testing or force refresh)
 */
export const clearModelsCache = (): void => {
  modelsCache = null;
  cacheTimestamp = 0;
};
