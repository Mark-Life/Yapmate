import { useQuery } from "@tanstack/react-query";
import { BANNED_MODELS, TOP_MODELS } from "@yapmate/core/models/config";
import { parseModel } from "@yapmate/server/lib/models/models";
import { rpcClient } from "../lib/rpc-client";

/**
 * Fetches models from server API
 */
const fetchModelsFromApi = async () => {
  const { models } = await rpcClient.models.list();
  return models;
};

type TransformedModel = {
  name: string;
  value: string;
  provider: string;
  contextLimit?: number;
  inputLimit?: number;
  outputLimit?: number;
};

/**
 * Filters and sorts models: removes banned models and prioritizes top models
 */
const processModels = (
  modelsData: Array<{
    id: string;
    name: string;
    contextLimit?: number;
    inputLimit?: number;
    outputLimit?: number;
  }>
): TransformedModel[] => {
  const bannedSet = new Set(BANNED_MODELS as readonly string[]);
  const topModelsSet = new Set(TOP_MODELS as readonly string[]);

  // Filter out banned models and transform
  const transformed = modelsData
    .filter((model) => !bannedSet.has(model.id))
    .map((model) => {
      const parsed = parseModel(model.id);
      return {
        name: parsed.modelName,
        value: model.id,
        provider: parsed.provider,
        contextLimit: model.contextLimit,
        inputLimit: model.inputLimit,
        outputLimit: model.outputLimit,
        isTopModel: topModelsSet.has(model.id),
      };
    });

  // Sort: top models first, then by provider and name
  return transformed.sort((a, b) => {
    // Top models come first
    if (a.isTopModel && !b.isTopModel) {
      return -1;
    }
    if (!a.isTopModel && b.isTopModel) {
      return 1;
    }

    // Within same category, sort by provider then name
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.name.localeCompare(b.name);
  });
};

/**
 * Fetches and transforms models from the service using TanStack Query
 * Returns cached data for 1 hour to prevent redundant requests
 * Filters banned models and prioritizes top models
 */
export const useModels = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModelsFromApi,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000, // 1 hour
    select: processModels,
  });

  return { models: data ?? [], loading: isLoading };
};
