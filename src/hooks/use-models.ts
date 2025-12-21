import { useQuery } from "@tanstack/react-query";
import { parseModel } from "@/lib/models";

/**
 * Fetches models from server API
 */
const fetchModelsFromApi = async (): Promise<string[]> => {
  const response = await fetch("/api/models");
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  const data = await response.json();
  return data.models;
};

type TransformedModel = {
  name: string;
  value: string;
  provider: string;
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
    select: (modelIds): TransformedModel[] =>
      modelIds.map((value) => ({
        name: parseModel(value).modelName,
        value,
        provider: parseModel(value).provider,
      })),
  });

  return { models: data ?? [], loading: isLoading };
};
