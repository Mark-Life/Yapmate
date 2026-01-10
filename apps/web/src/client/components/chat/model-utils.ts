import { TOP_MODELS } from "@yapmate/core/models/config";

/**
 * Groups models by provider, with top models in a "Common" group first
 */
export const groupModelsByProvider = (
  modelsList: Array<{ name: string; value: string; provider: string }>
) => {
  const topModelsSet = new Set<string>(TOP_MODELS);
  const commonModels: Array<{ name: string; value: string; provider: string }> =
    [];
  const grouped = new Map<string, Array<{ name: string; value: string }>>();

  for (const model of modelsList) {
    if (topModelsSet.has(model.value)) {
      commonModels.push({
        name: model.name,
        value: model.value,
        provider: model.provider,
      });
    } else {
      const existing = grouped.get(model.provider) ?? [];
      grouped.set(model.provider, [
        ...existing,
        { name: model.name, value: model.value },
      ]);
    }
  }

  const result: Array<{
    provider: string;
    items: Array<{ name: string; value: string; provider?: string }>;
  }> = [];

  // Add Common group first if it has models
  if (commonModels.length > 0) {
    result.push({ provider: "common", items: commonModels });
  }

  // Add other provider groups
  result.push(
    ...Array.from(grouped.entries()).map(([provider, items]) => ({
      provider,
      items,
    }))
  );

  return result;
};

/**
 * Formats provider name for display
 */
export const getProviderDisplayName = (provider: string): string => {
  if (provider === "common") {
    return "Common";
  }
  if (provider === "google") {
    return "Google";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};
