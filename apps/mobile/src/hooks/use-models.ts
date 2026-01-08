import { useQuery } from "@tanstack/react-query";
import { BANNED_MODELS, TOP_MODELS } from "@yapmate/core/models/config";
import { parseModel } from "../lib/parse-model";
import { rpcClient } from "../lib/rpc-client";

/**
 * Fetches models from server API
 */
const fetchModelsFromApi = async () => {
  const { models } = await rpcClient.models.list();
  return models;
};

export type TransformedModel = {
  name: string;
  value: string;
  provider: string;
  description?: string;
  contextLimit?: number | null;
  inputLimit?: number;
  outputLimit?: number;
  supportsTools?: boolean;
  supportsReasoning?: boolean;
};

type ApiModel = {
  id: string;
  name: string;
  description?: string;
  contextLimit?: number | null;
  inputLimit?: number;
  outputLimit?: number;
  supportsTools?: boolean;
  supportsReasoning?: boolean;
};

/**
 * Filters and sorts models: removes banned models and prioritizes top models
 */
const processModels = (modelsData: ApiModel[]): TransformedModel[] => {
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
        description: model.description,
        contextLimit: model.contextLimit,
        inputLimit: model.inputLimit,
        outputLimit: model.outputLimit,
        supportsTools: model.supportsTools,
        supportsReasoning: model.supportsReasoning,
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
