import { Host, Picker, Switch } from "@expo/ui/swift-ui";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  BookText,
  Brain,
  ChevronRight,
  Database,
  ExternalLink,
  Wrench,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassWrapper } from "@/components/ui/glass-wrapper";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useRules } from "@/hooks/use-rules";
import type {
  McpToolSelection,
  ReasoningEffort,
} from "@/hooks/use-user-preferences";
import {
  createCustomEvent,
  type EventListener,
  eventTarget,
} from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

type UserRule = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
};

const REASONING_OPTIONS: Array<{
  value: ReasoningEffort;
  label: string;
  description: string;
}> = [
  { value: "low", label: "Quick", description: "Fast responses" },
  { value: "medium", label: "Balanced", description: "Standard thinking" },
  { value: "high", label: "Deep", description: "Extended reasoning" },
];

/**
 * Chat controls screen - unified controls panel (formSheet)
 * Includes: Memory toggle, Reasoning depth, AI Rules selector
 */
export default function ChatControlsScreen() {
  const router = useRouter();
  const {
    selectedRuleIds: selectedRuleIdsParam,
    memoryEnabled: memoryEnabledParam,
    reasoningEffort: reasoningEffortParam,
    selectedMcpTools: selectedMcpToolsParam,
  } = useLocalSearchParams<{
    selectedRuleIds?: string;
    memoryEnabled?: string;
    reasoningEffort?: string;
    selectedMcpTools?: string;
  }>();
  const { rules, isLoading } = useRules();
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Parse initial values from params
  const initialSelectedIds = useMemo(() => {
    if (!selectedRuleIdsParam) {
      return [];
    }
    try {
      return JSON.parse(selectedRuleIdsParam) as string[];
    } catch {
      return [];
    }
  }, [selectedRuleIdsParam]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [memoryEnabled, setMemoryEnabled] = useState(
    () => memoryEnabledParam === "true"
  );
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    () => (reasoningEffortParam as ReasoningEffort) || "low"
  );

  // Parse initial MCP tools from params
  const initialMcpTools = useMemo(() => {
    if (!selectedMcpToolsParam) {
      return [];
    }
    try {
      return JSON.parse(selectedMcpToolsParam) as McpToolSelection[];
    } catch {
      return [];
    }
  }, [selectedMcpToolsParam]);

  const [selectedMcpTools, setSelectedMcpTools] =
    useState<McpToolSelection[]>(initialMcpTools);

  // Filter rules by search (title or content)
  const filteredRules = useMemo(() => {
    if (!search.trim()) {
      return rules;
    }
    const query = search.toLowerCase();
    return rules.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query)
    );
  }, [rules, search]);

  /**
   * Toggles rule selection
   */
  const toggleRule = (ruleId: string) => {
    lightTap();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  /**
   * Toggles memory enabled
   */
  const toggleMemory = (value: boolean) => {
    lightTap();
    setMemoryEnabled(value);
  };

  /**
   * Sets reasoning effort level
   */
  const selectReasoningEffort = (effort: ReasoningEffort) => {
    lightTap();
    setReasoningEffort(effort);
  };

  /**
   * Opens MCP tools selection sheet
   */
  const openMcpTools = () => {
    lightTap();
    router.push({
      pathname: "/mcp-tools",
      params: {
        selectedMcpTools: JSON.stringify(selectedMcpTools),
      },
    });
  };

  /**
   * Listen for mcp-tools-updated events
   */
  useEffect(() => {
    const handleMcpToolsUpdated: EventListener = (event) => {
      const detail = event.detail as { selectedMcpTools: McpToolSelection[] };
      setSelectedMcpTools(detail.selectedMcpTools);
    };

    eventTarget.addEventListener("mcp-tools-updated", handleMcpToolsUpdated);

    return () => {
      eventTarget.removeEventListener(
        "mcp-tools-updated",
        handleMcpToolsUpdated
      );
    };
  }, []);

  /**
   * Opens web settings page for creating rules
   */
  const openWebSettings = () => {
    Linking.openURL("https://yapmate.com/settings/rules");
  };

  /**
   * Emit event on unmount with current values
   */
  useFocusEffect(
    useCallback(
      () => () => {
        eventTarget.dispatchEvent(
          createCustomEvent("controls-updated", {
            selectedRuleIds: Array.from(selectedIds),
            memoryEnabled,
            reasoningEffort,
            selectedMcpTools,
          })
        );
      },
      [selectedIds, memoryEnabled, reasoningEffort, selectedMcpTools]
    )
  );

  /**
   * Renders a rule item with checkbox
   */
  const renderRule = ({
    item,
    isFirst,
    isLast,
  }: {
    item: UserRule;
    isFirst: boolean;
    isLast: boolean;
  }) => (
    <Pressable
      className={`flex flex-row items-center gap-3 px-3 py-3 active:bg-accent ${isFirst ? "rounded-t-md" : ""} ${isLast ? "rounded-b-md" : ""}`}
      onPress={() => toggleRule(item.id)}
    >
      <Checkbox
        checked={selectedIds.has(item.id)}
        className="size-5"
        onCheckedChange={() => toggleRule(item.id)}
      />
      <View className="flex-1">
        <Text className="font-medium text-foreground text-sm" numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          className="mt-0.5 text-muted-foreground text-xs"
          numberOfLines={2}
        >
          {item.content}
        </Text>
      </View>
    </Pressable>
  );

  /**
   * Renders empty state for rules
   */
  const _renderRulesEmptyState = () => {
    if (isLoading) {
      return (
        <View className="items-center justify-center px-4 py-6">
          <Text className="text-muted-foreground text-sm">
            Loading rules...
          </Text>
        </View>
      );
    }
    if (rules.length === 0) {
      return (
        <View className="items-center justify-center px-4 py-6">
          <Text className="mb-1 text-center font-medium text-foreground text-sm">
            No rules yet
          </Text>
          <Text className="mb-3 text-center text-muted-foreground text-xs">
            Create rules in web settings
          </Text>
          <Pressable
            className="flex flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 active:opacity-80"
            onPress={openWebSettings}
          >
            <Text className="font-medium text-primary-foreground text-xs">
              Open Settings
            </Text>
            <Icon
              as={ExternalLink}
              className="text-primary-foreground"
              size={12}
            />
          </Pressable>
        </View>
      );
    }
    if (filteredRules.length === 0) {
      return (
        <View className="items-center justify-center px-4 py-6">
          <Text className="text-muted-foreground text-sm">
            No rules match "{search}"
          </Text>
        </View>
      );
    }
    return null;
  };

  const selectedCount = selectedIds.size;
  const mcpToolsCount = selectedMcpTools.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ paddingTop: 16 }}
    >
      <ScrollView
        className="flex"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Memory Section */}
        <View className="flex flex-col p-6">
          <View className="flex flex-row items-center gap-2 pb-2">
            <Icon as={Database} className="text-muted-foreground" size={16} />
            <Text className="font-semibold text-base text-foreground">
              Memory
            </Text>
          </View>
          <View className="flex flex-row items-center justify-between rounded-lg py-3">
            <View className="flex-1">
              <Text className="font-medium text-foreground text-sm">
                Enable Memory
              </Text>
              <Text className="text-muted-foreground text-xs">
                AI remembers context across conversations
              </Text>
            </View>
            <Host matchContents>
              <Switch
                onValueChange={toggleMemory}
                value={memoryEnabled}
                variant="switch"
              />
            </Host>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-foreground opacity-20" />

        {/* Reasoning Section */}
        <View className="p-6 py-8">
          <View className="flex flex-row items-center gap-2 pb-3">
            <Icon as={Brain} className="text-muted-foreground" size={16} />
            <Text className="font-semibold text-base text-foreground">
              Thinking Depth
            </Text>
          </View>
          <Host matchContents>
            <Picker
              onOptionSelected={({ nativeEvent: { index } }) => {
                selectReasoningEffort(REASONING_OPTIONS[index].value);
              }}
              options={REASONING_OPTIONS.map((o) => o.label)}
              selectedIndex={REASONING_OPTIONS.findIndex(
                (o) => o.value === reasoningEffort
              )}
              variant="segmented"
            />
          </Host>
        </View>

        {/* Divider */}
        <View className="h-px bg-foreground opacity-20" />

        {/* Rules Section */}
        <View className="flex flex-col gap-2 p-6 py-8">
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-2">
              <Icon as={BookText} className="text-muted-foreground" size={16} />
              <Text className="font-semibold text-base text-foreground">
                AI Rules
              </Text>
            </View>
            {selectedCount > 0 && (
              <Text className="text-muted-foreground text-xs">
                {selectedCount} selected
              </Text>
            )}
          </View>
          <Text className="pb-2 text-muted-foreground text-xs">
            Selected rules are prepended to your messages
          </Text>

          {/* Search input */}
          {rules.length > 0 && (
            <View className="pb-2">
              <GlassWrapper
                style={{ borderRadius: 12, padding: 0, overflow: "hidden" }}
              >
                <Input
                  className="rounded-md border-input bg-transparent"
                  onChangeText={setSearch}
                  placeholder="Search rules..."
                  ref={inputRef}
                  value={search}
                />
              </GlassWrapper>
            </View>
          )}

          {/* Rules list */}
          {filteredRules.length > 0 ? (
            <View className="rounded-lg border border-border">
              {filteredRules.map((rule, index) => (
                <View key={rule.id}>
                  {renderRule({
                    item: rule,
                    isFirst: index === 0,
                    isLast: index === filteredRules.length - 1,
                  })}
                  {index < filteredRules.length - 1 && (
                    <View className="h-px bg-border" />
                  )}
                </View>
              ))}
            </View>
          ) : (
            // renderRulesEmptyState()
            <View className="rounded-lg border border-border px-4 py-2">
              <Text className="text-muted-foreground text-sm">No rules</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View className="h-px bg-foreground opacity-20" />

        {/* MCP Tools Section */}
        <View className="p-6 py-8">
          <Pressable
            className="flex flex-row items-center justify-between rounded-full px-3 py-3 active:bg-accent"
            onPress={openMcpTools}
          >
            <View className="flex flex-row items-center gap-2">
              <Icon as={Wrench} className="text-muted-foreground" size={16} />
              <Text className="font-semibold text-base text-foreground">
                MCP Tools
              </Text>
              {mcpToolsCount > 0 && (
                <Text className="text-muted-foreground text-xs">
                  {mcpToolsCount} selected
                </Text>
              )}
            </View>
            <Icon
              as={ChevronRight}
              className="text-muted-foreground"
              size={20}
            />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
