import { LegendList } from "@legendapp/list";
import { TOP_MODELS } from "@yapmate/core/models/config";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import { useModels } from "@/hooks/use-models";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

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

type ListItem =
  | { type: "section"; provider: string }
  | {
      type: "model";
      name: string;
      value: string;
      provider: string;
      groupProvider?: string;
    };

/**
 * Flattens grouped models into a list with section headers
 */
const flattenGroupedModels = (
  grouped: Array<{
    provider: string;
    items: Array<{ name: string; value: string }>;
  }>
): ListItem[] => {
  const result: ListItem[] = [];
  for (const group of grouped) {
    result.push({ type: "section", provider: group.provider });
    for (const item of group.items) {
      result.push({
        type: "model",
        name: item.name,
        value: item.value,
        provider: item.provider ?? group.provider,
        groupProvider: group.provider,
      });
    }
  }
  return result;
};

/**
 * Filters models by search query (case-insensitive, matches name or provider)
 */
const filterModels = (
  models: Array<{ name: string; value: string; provider: string }>,
  query: string
) => {
  if (!query.trim()) {
    return models;
  }
  const lowerQuery = query.toLowerCase();
  return models.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.provider.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Model selector screen presented as formSheet
 * Allows user to search and select a model
 */
export default function ModelSelectorScreen() {
  const router = useRouter();
  const { model: currentModelParam } = useLocalSearchParams<{
    model?: string;
  }>();
  const { models, loading } = useModels();
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);
  const { capture } = useAnalytics();

  const currentModel = currentModelParam ?? "";

  const filteredModels = useMemo(
    () => filterModels(models, search),
    [models, search]
  );
  const groupedModels = useMemo(
    () => groupModelsByProvider(filteredModels),
    [filteredModels]
  );
  const listItems = useMemo(
    () => flattenGroupedModels(groupedModels),
    [groupedModels]
  );

  /**
   * Handles model selection
   * Dispatches event and navigates back
   */
  const handleSelect = (value: string) => {
    lightTap();
    capture(AnalyticsEvents.MODEL_CHANGED, {
      model: value,
      previous_model: currentModel || undefined,
    });
    // Dispatch event to notify Chat component
    eventTarget.dispatchEvent(
      createCustomEvent("model-selected", { model: value })
    );
    router.back();
  };

  /**
   * Focuses search input when screen comes into focus
   * Uses useFocusEffect to ensure focus happens after navigation completes
   */
  useFocusEffect(
    useCallback(() => {
      // Delay focus to ensure keyboard dismisses from previous screen first
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timeoutId);
    }, [])
  );

  /**
   * Renders a list item (section header or model)
   */
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "section") {
      return (
        <View className="px-3 py-1.5">
          <Text className="text-muted-foreground text-xs">
            {getProviderDisplayName(item.provider)}
          </Text>
        </View>
      );
    }
    return (
      <Pressable
        className="flex flex-row items-center gap-2 rounded-sm px-3 py-2 active:bg-accent"
        onPress={() => handleSelect(item.value)}
      >
        <Text className="flex-1 text-foreground text-sm">{item.name}</Text>
        {item.value === currentModel && (
          <Icon as={Check} className="size-4 text-muted-foreground" />
        )}
      </Pressable>
    );
  };

  /**
   * Renders the model list content based on loading and data state
   */
  const renderListContent = () => {
    if (loading) {
      return (
        <View className="flex-1 px-3 py-2">
          <Text className="text-muted-foreground text-sm">
            Loading models...
          </Text>
        </View>
      );
    }
    if (listItems.length === 0) {
      return (
        <View className="flex-1 px-3 py-2">
          <Text className="text-muted-foreground text-sm">
            No models found.
          </Text>
        </View>
      );
    }
    return (
      <LegendList
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 60 }}
        data={listItems}
        estimatedItemSize={44}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item, index) =>
          item.type === "section"
            ? `section-${item.provider}`
            : `model-${item.value}-${index}`
        }
        recycleItems
        renderItem={renderItem}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ paddingTop: 16 }}
    >
      {/* Search input */}
      <View className="px-4 pb-2">
        <Input
          className="h-10 rounded-2xl border-0 bg-transparent"
          onChangeText={setSearch}
          placeholder="Search models..."
          ref={inputRef}
          value={search}
        />
      </View>

      {/* Model list */}
      {renderListContent()}
    </KeyboardAvoidingView>
  );
}
