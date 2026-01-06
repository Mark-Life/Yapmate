"use client";

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  type ModelSelectorLogoProps,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@yapmate/components/ai-elements/model-selector";
import { PromptInputButton } from "@yapmate/components/ai-elements/prompt-input";
import { TOP_MODELS } from "@yapmate/core/models/config";
import { useMemo, useState } from "react";
import { useModels } from "../hooks/use-models";

/**
 * Groups models by provider, with top models in a "Common" group first
 */
const groupModelsByProvider = (
  modelsList: Array<{ name: string; value: string; provider: string }>
) => {
  const topModelsSet = new Set(TOP_MODELS);
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
const getProviderDisplayName = (provider: string): string => {
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

type ModelSelectorComboboxProps = {
  model: string;
  onModelChange: (model: string) => void;
};

/**
 * Model selector combobox component
 */
export const ModelSelectorCombobox = ({
  model,
  onModelChange,
}: ModelSelectorComboboxProps) => {
  const [open, setOpen] = useState(false);
  const { models, loading } = useModels();

  const groupedModels = useMemo(() => groupModelsByProvider(models), [models]);
  const currentModel = useMemo(
    () => models.find((m) => m.value === model),
    [model, models]
  );

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          aria-expanded={open}
          className="gap-2 border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground"
        >
          {currentModel ? (
            <ModelSelectorLogo
              provider={
                currentModel.provider as ModelSelectorLogoProps["provider"]
              }
            />
          ) : null}
          <span>{currentModel?.name}</span>
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>
            {loading ? "Loading models..." : "No models found."}
          </ModelSelectorEmpty>
          {groupedModels.map((group) => (
            <ModelSelectorGroup key={group.provider}>
              <div className="cmdk-group-heading pb-1 pl-2">
                {getProviderDisplayName(group.provider)}
              </div>
              {group.items.map((item) => (
                <ModelSelectorItem
                  key={item.value}
                  onSelect={() => {
                    onModelChange(item.value);
                    setOpen(false);
                  }}
                  value={item.value}
                >
                  <ModelSelectorLogo
                    provider={
                      (item.provider ??
                        group.provider) as ModelSelectorLogoProps["provider"]
                    }
                  />
                  <ModelSelectorName>{item.name}</ModelSelectorName>
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
