import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useModels } from "@/hooks/use-models";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

/**
 * Groups models by provider
 */
const groupModelsByProvider = (
  modelsList: Array<{ name: string; value: string; provider: string }>
) => {
  const grouped = new Map<string, Array<{ name: string; value: string }>>();
  for (const model of modelsList) {
    const existing = grouped.get(model.provider) ?? [];
    grouped.set(model.provider, [
      ...existing,
      { name: model.name, value: model.value },
    ]);
  }
  return Array.from(grouped.entries()).map(([provider, items]) => ({
    provider,
    items,
  }));
};

/**
 * Formats provider name for display
 */
const getProviderDisplayName = (provider: string): string => {
  if (provider === "google") {
    return "Google";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
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

  const currentModel = currentModelParam ?? "";

  const filteredModels = useMemo(
    () => filterModels(models, search),
    [models, search]
  );
  const groupedModels = useMemo(
    () => groupModelsByProvider(filteredModels),
    [filteredModels]
  );

  /**
   * Handles model selection
   * Dispatches event and navigates back
   */
  const handleSelect = (value: string) => {
    lightTap();
    // Dispatch event to notify Chat component
    eventTarget.dispatchEvent(
      createCustomEvent("model-selected", { model: value })
    );
    router.back();
  };

  /**
   * Focuses search input when screen appears
   */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <View className="px-3 py-2">
          <Text className="text-muted-foreground text-sm">
            Loading models...
          </Text>
        </View>
      );
    }
    if (groupedModels.length === 0) {
      return (
        <View className="px-3 py-2">
          <Text className="text-muted-foreground text-sm">
            No models found.
          </Text>
        </View>
      );
    }
    return groupedModels.map((group) => (
      <View key={group.provider}>
        <Text className="px-3 py-1.5 text-muted-foreground text-xs">
          {getProviderDisplayName(group.provider)}
        </Text>
        {group.items.map((item) => (
          <Pressable
            className="flex flex-row items-center gap-2 rounded-sm px-3 py-2 active:bg-accent"
            key={item.value}
            onPress={() => handleSelect(item.value)}
          >
            <Text className="flex-1 text-foreground text-sm">{item.name}</Text>
            {item.value === currentModel && (
              <Icon as={Check} className="size-4 text-muted-foreground" />
            )}
          </Pressable>
        ))}
      </View>
    ));
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
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-1 pb-2">{renderContent()}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
