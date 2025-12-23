import { useQuery } from "@tanstack/react-query";
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
 * Fetches and transforms models from the service using TanStack Query
 * Returns cached data for 1 hour to prevent redundant requests
 */
export const useModels = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModelsFromApi,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000, // 1 hour
    select: (modelsData): TransformedModel[] =>
      modelsData.map((model) => ({
        name: parseModel(model.id).modelName,
        value: model.id,
        provider: parseModel(model.id).provider,
        contextLimit: model.contextLimit,
        inputLimit: model.inputLimit,
        outputLimit: model.outputLimit,
      })),
  });

  return { models: data ?? [], loading: isLoading };
};
