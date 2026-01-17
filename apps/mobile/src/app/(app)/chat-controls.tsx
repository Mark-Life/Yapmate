import { LegendList } from "@legendapp/list";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { BookText, ExternalLink } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  type TextInput,
  View,
} from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useRules } from "@/hooks/use-rules";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

type UserRule = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
};

/**
 * Chat controls screen - unified controls panel (formSheet)
 * Currently includes: AI Rules selector
 * Future sections: MCP Tools, Memory toggle, Reasoning depth
 */
export default function ChatControlsScreen() {
  const { selectedRuleIds: selectedRuleIdsParam } = useLocalSearchParams<{
    selectedRuleIds?: string;
  }>();
  const { rules, isLoading } = useRules();
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Parse initial selected rule IDs from params
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
   * Opens web settings page for creating rules
   */
  const openWebSettings = () => {
    Linking.openURL("https://yapmate.com/settings");
  };

  /**
   * Focus search input on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => {
        clearTimeout(timeoutId);
        // Emit event when sheet is dismissed (via gesture or back)
        eventTarget.dispatchEvent(
          createCustomEvent("controls-updated", {
            selectedRuleIds: Array.from(selectedIds),
          })
        );
      };
    }, [selectedIds])
  );

  /**
   * Renders a rule item with checkbox
   */
  const renderRule = ({ item }: { item: UserRule }) => (
    <Pressable
      className="flex flex-row items-start gap-3 rounded-lg px-3 py-3 active:bg-accent"
      onPress={() => toggleRule(item.id)}
    >
      <Checkbox
        checked={selectedIds.has(item.id)}
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
   * Renders empty state based on loading, no rules, or no matches
   */
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-8">
          <Text className="text-muted-foreground text-sm">
            Loading rules...
          </Text>
        </View>
      );
    }
    if (rules.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-8">
          <Icon
            as={BookText}
            className="mb-3 text-muted-foreground"
            size={32}
          />
          <Text className="mb-1 text-center font-medium text-foreground text-sm">
            No rules yet
          </Text>
          <Text className="mb-4 text-center text-muted-foreground text-xs">
            Create rules in web settings to customize AI behavior
          </Text>
          <Pressable
            className="flex flex-row items-center gap-1.5 rounded-lg bg-primary px-4 py-2 active:opacity-80"
            onPress={openWebSettings}
          >
            <Text className="font-medium text-primary-foreground text-sm">
              Open Settings
            </Text>
            <Icon
              as={ExternalLink}
              className="text-primary-foreground"
              size={14}
            />
          </Pressable>
        </View>
      );
    }
    if (filteredRules.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-8">
          <Text className="text-muted-foreground text-sm">
            No rules match "{search}"
          </Text>
        </View>
      );
    }
    return null;
  };

  const selectedCount = selectedIds.size;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ paddingTop: 16 }}
    >
      {/* Header */}
      <View className="flex flex-row items-center justify-between px-4 pb-2">
        <Text className="font-semibold text-foreground text-lg">AI Rules</Text>
        {selectedCount > 0 && (
          <Text className="text-muted-foreground text-sm">
            {selectedCount} selected
          </Text>
        )}
      </View>

      {/* Search input */}
      <View className="px-4 pb-2">
        <Input
          className="h-10 rounded-2xl border-0 bg-transparent"
          onChangeText={setSearch}
          placeholder="Search rules..."
          ref={inputRef}
          value={search}
        />
      </View>

      {/* Rules list */}
      {filteredRules.length > 0 ? (
        <LegendList
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 80 }}
          data={filteredRules}
          estimatedItemSize={72}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          recycleItems
          renderItem={renderRule}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Footer hint */}
      {rules.length > 0 && (
        <View className="absolute right-0 bottom-0 left-0 border-border border-t bg-background px-4 py-3">
          <Text className="text-center text-muted-foreground text-xs">
            Selected rules are prepended to your messages
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
