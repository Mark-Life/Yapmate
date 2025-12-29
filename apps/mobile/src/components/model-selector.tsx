import { BlurView } from "expo-blur";
import { Check, ChevronDown } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useModels } from "../hooks/use-models";

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

type ModelSelectorProps = {
  model: string;
  onModelChange: (model: string) => void;
  /** Optional className to override trigger styles (e.g., when inside GlassView) */
  triggerClassName?: string;
};

/**
 * Model selector combobox with search functionality
 * Uses a bottom sheet modal with keyboard avoidance
 */
export const ModelSelector = ({
  model,
  onModelChange,
  triggerClassName,
}: ModelSelectorProps) => {
  const { models, loading } = useModels();
  const { colorScheme } = useColorScheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);

  const filteredModels = useMemo(
    () => filterModels(models, search),
    [models, search]
  );
  const groupedModels = useMemo(
    () => groupModelsByProvider(filteredModels),
    [filteredModels]
  );
  const currentModel = useMemo(
    () => models.find((m) => m.value === model),
    [model, models]
  );

  const handleOpen = () => {
    lightTap();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch("");
  };

  const handleSelect = (value: string) => {
    lightTap();
    onModelChange(value);
    handleClose();
  };

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
            {item.value === model && (
              <Icon as={Check} className="size-4 text-muted-foreground" />
            )}
          </Pressable>
        ))}
      </View>
    ));
  };

  return (
    <>
      <Pressable
        className={cn(
          "flex h-9 flex-row items-center gap-2 rounded-full px-3 py-2",
          triggerClassName ?? "bg-transparent"
        )}
        onPress={handleOpen}
      >
        <Text
          className={cn(
            "flex-1 text-sm",
            currentModel ? "text-foreground" : "text-muted-foreground"
          )}
          ellipsizeMode="tail"
          numberOfLines={1}
        >
          {loading ? "Loading..." : (currentModel?.name ?? "Select model")}
        </Text>
        <Icon
          as={ChevronDown}
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={handleClose}
        transparent
        visible={open}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          {/* Backdrop */}
          <Pressable onPress={handleClose} style={StyleSheet.absoluteFill}>
            <View className="flex-1 bg-black/50" />
          </Pressable>

          {/* Sheet content */}
          <View className="w-full px-2 pb-2">
            <BlurView
              className="w-full overflow-hidden rounded-3xl border border-border"
              intensity={80}
              tint={colorScheme === "dark" ? "dark" : "light"}
            >
              {/* Drag handle */}
              <View className="items-center py-3">
                <View className="h-1 w-14 rounded-full bg-muted-foreground" />
              </View>

              {/* Search input */}
              <View className="pb-2">
                <Input
                  className="h-10 rounded-2xl border-0 bg-transparent"
                  onChangeText={setSearch}
                  placeholder="Search models..."
                  ref={inputRef}
                  value={search}
                />
              </View>

              {/* Model list */}
              <ScrollView
                className="max-h-72"
                keyboardShouldPersistTaps="handled"
              >
                <View className="px-1 pb-2">{renderContent()}</View>
              </ScrollView>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
});
