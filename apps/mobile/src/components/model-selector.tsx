import { Check, ChevronDown } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  /** Portal host name for rendering popover inside KeyboardAvoidingView */
  portalHost?: string;
};

/**
 * Model selector combobox with search functionality
 */
export const ModelSelector = ({
  model,
  onModelChange,
  portalHost,
}: ModelSelectorProps) => {
  const { models, loading } = useModels();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
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

  const handleLayout = (event: LayoutChangeEvent) => {
    setTriggerWidth(event.nativeEvent.layout.width);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch("");
    }
  };

  const handleSelect = (value: string) => {
    onModelChange(value);
    setOpen(false);
    setSearch("");
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
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Pressable
          className="flex h-9 flex-row items-center justify-between gap-2 rounded-full border border-input bg-background/50 px-3 py-2"
          onLayout={handleLayout}
        >
          <Text
            className={cn(
              "text-sm",
              currentModel ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {loading ? "Loading..." : (currentModel?.name ?? "Select model")}
          </Text>
          <Icon as={ChevronDown} className="size-4 text-muted-foreground" />
        </Pressable>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-120 rounded-xl p-0"
        portalHost={portalHost}
        side="top"
        sideOffset={70}
        style={{ width: triggerWidth > 0 ? triggerWidth : undefined }}
      >
        <View className="border-border border-b p-2">
          <Input
            className="h-8 border-0 bg-transparent shadow-none"
            onChangeText={setSearch}
            placeholder="Search models..."
            // ref={inputRef}
            value={search}
          />
        </View>
        <ScrollView className="max-h-80">{renderContent()}</ScrollView>
      </PopoverContent>
    </Popover>
  );
};
