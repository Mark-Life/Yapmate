import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Server,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useMcpServers, useMcpToolsForServers } from "@/hooks/use-mcp";
import type { McpToolSelection } from "@/hooks/use-user-preferences";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

type McpTool = {
  id: string;
  mcpServerId: string;
  name: string;
  description: string | null;
};

type McpServer = {
  id: string;
  name: string;
  enabled: boolean;
};

/**
 * MCP Tools selection screen - hierarchical server -> tools selection
 * Opens as formSheet from chat-controls
 */
export default function McpToolsScreen() {
  const router = useRouter();
  const { selectedMcpTools: selectedMcpToolsParam } = useLocalSearchParams<{
    selectedMcpTools?: string;
  }>();
  const { servers, isLoading: isLoadingServers } = useMcpServers();
  const [search, setSearch] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    () => new Set()
  );

  // Only show enabled servers
  const enabledServers = useMemo(
    () => servers.filter((s) => s.enabled),
    [servers]
  );

  const serverIds = useMemo(
    () => enabledServers.map((s) => s.id),
    [enabledServers]
  );
  const { toolsMap, isLoading: isLoadingTools } =
    useMcpToolsForServers(serverIds);

  // Parse initial selections from params
  const initialSelections = useMemo(() => {
    if (!selectedMcpToolsParam) {
      return [];
    }
    try {
      return JSON.parse(selectedMcpToolsParam) as McpToolSelection[];
    } catch {
      return [];
    }
  }, [selectedMcpToolsParam]);

  const [selections, setSelections] =
    useState<McpToolSelection[]>(initialSelections);

  /**
   * Checks if a specific tool is selected
   */
  const isToolSelected = useCallback(
    (serverId: string, toolName: string) =>
      selections.some(
        (s) =>
          s.mcpServerId === serverId &&
          (s.toolName === "*" || s.toolName === toolName)
      ),
    [selections]
  );

  /**
   * Checks if server has wildcard selection (all tools)
   */
  const isServerWildcard = useCallback(
    (serverId: string) =>
      selections.some((s) => s.mcpServerId === serverId && s.toolName === "*"),
    [selections]
  );

  /**
   * Gets count of selected tools for a server
   */
  const getServerSelectionCount = useCallback(
    (serverId: string) => {
      if (isServerWildcard(serverId)) {
        return toolsMap.get(serverId)?.length ?? 0;
      }
      return selections.filter((s) => s.mcpServerId === serverId).length;
    },
    [selections, isServerWildcard, toolsMap]
  );

  /**
   * Toggles server wildcard selection
   */
  const toggleServerWildcard = (serverId: string) => {
    lightTap();
    setSelections((prev) => {
      const hasWildcard = prev.some(
        (s) => s.mcpServerId === serverId && s.toolName === "*"
      );
      if (hasWildcard) {
        // Remove wildcard
        return prev.filter(
          (s) => !(s.mcpServerId === serverId && s.toolName === "*")
        );
      }
      // Remove individual selections and add wildcard
      const filtered = prev.filter((s) => s.mcpServerId !== serverId);
      return [...filtered, { mcpServerId: serverId, toolName: "*" }];
    });
  };

  /**
   * Toggles individual tool selection
   */
  const toggleTool = (serverId: string, toolName: string) => {
    lightTap();
    setSelections((prev) => {
      // If server has wildcard, switch to individual selections minus this tool
      if (isServerWildcard(serverId)) {
        const serverTools = toolsMap.get(serverId) ?? [];
        const newSelections = prev.filter((s) => s.mcpServerId !== serverId);
        for (const tool of serverTools) {
          if (tool.name !== toolName) {
            newSelections.push({ mcpServerId: serverId, toolName: tool.name });
          }
        }
        return newSelections;
      }

      const exists = prev.some(
        (s) => s.mcpServerId === serverId && s.toolName === toolName
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.mcpServerId === serverId && s.toolName === toolName)
        );
      }
      return [...prev, { mcpServerId: serverId, toolName }];
    });
  };

  /**
   * Toggles server expansion
   */
  const toggleExpanded = (serverId: string) => {
    lightTap();
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  /**
   * Filter tools by search query
   */
  const filterTools = useCallback(
    (tools: McpTool[]) => {
      if (!search.trim()) {
        return tools;
      }
      const query = search.toLowerCase();
      return tools.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    },
    [search]
  );

  /**
   * Opens web settings for server management
   */
  const openWebSettings = () => {
    Linking.openURL("https://yapmate.com/settings");
  };

  /**
   * Emits selections and closes sheet
   */
  const handleClose = useCallback(() => {
    eventTarget.dispatchEvent(
      createCustomEvent("mcp-tools-updated", { selectedMcpTools: selections })
    );
    router.back();
  }, [selections, router]);

  const isLoading = isLoadingServers || isLoadingTools;

  /**
   * Renders empty state
   */
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="items-center justify-center px-4 py-12">
          <Text className="text-muted-foreground text-sm">
            Loading servers...
          </Text>
        </View>
      );
    }
    if (enabledServers.length === 0) {
      return (
        <View className="items-center justify-center px-4 py-12">
          <Icon as={Server} className="mb-3 text-muted-foreground" size={32} />
          <Text className="mb-1 text-center font-medium text-foreground text-sm">
            No MCP servers
          </Text>
          <Text className="mb-4 text-center text-muted-foreground text-xs">
            Configure MCP servers in web settings
          </Text>
          <Pressable
            className="flex flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-2 active:opacity-80"
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
    return null;
  };

  /**
   * Renders tools list content based on tools state
   */
  const renderToolsContent = (
    tools: McpTool[],
    filteredTools: McpTool[],
    serverId: string
  ) => {
    if (tools.length === 0) {
      return (
        <View className="px-3 py-4">
          <Text className="text-center text-muted-foreground text-xs">
            No tools available
          </Text>
        </View>
      );
    }
    if (filteredTools.length === 0) {
      return (
        <View className="px-3 py-4">
          <Text className="text-center text-muted-foreground text-xs">
            No tools match "{search}"
          </Text>
        </View>
      );
    }
    return filteredTools.map((tool, idx) => (
      <View key={tool.id}>
        <Pressable
          className="flex flex-row items-start gap-3 px-3 py-2.5 active:bg-accent"
          onPress={() => toggleTool(serverId, tool.name)}
        >
          <Checkbox
            checked={isToolSelected(serverId, tool.name)}
            onCheckedChange={() => toggleTool(serverId, tool.name)}
          />
          <View className="flex-1">
            <Text
              className="font-medium text-foreground text-xs"
              numberOfLines={1}
            >
              {tool.name}
            </Text>
            {tool.description ? (
              <Text
                className="mt-0.5 text-muted-foreground text-xs"
                numberOfLines={2}
              >
                {tool.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {idx < filteredTools.length - 1 ? (
          <View className="mx-3 h-px bg-border/50" />
        ) : null}
      </View>
    ));
  };

  /**
   * Renders a server section with its tools
   */
  const renderServer = (server: McpServer) => {
    const tools = toolsMap.get(server.id) ?? [];
    const filteredTools = filterTools(tools);
    const isExpanded = expandedServers.has(server.id);
    const selectionCount = getServerSelectionCount(server.id);
    const hasWildcard = isServerWildcard(server.id);

    // Hide server if no tools match search
    if (search.trim() && filteredTools.length === 0) {
      return null;
    }

    return (
      <View className="mb-3" key={server.id}>
        {/* Server header */}
        <Pressable
          className="flex flex-row items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 active:bg-accent"
          onPress={() => toggleExpanded(server.id)}
        >
          <Icon
            as={isExpanded ? ChevronDown : ChevronRight}
            className="text-muted-foreground"
            size={16}
          />
          <Checkbox
            checked={hasWildcard}
            onCheckedChange={() => toggleServerWildcard(server.id)}
          />
          <View className="flex-1">
            <Text className="font-medium text-foreground text-sm">
              {server.name}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {tools.length} tools
              {selectionCount > 0 && !hasWildcard
                ? ` (${selectionCount} selected)`
                : ""}
              {hasWildcard ? " (all selected)" : ""}
            </Text>
          </View>
        </Pressable>

        {/* Tools list */}
        {isExpanded ? (
          <View className="mt-1 ml-6 rounded-lg bg-muted/30">
            {renderToolsContent(tools, filteredTools, server.id)}
          </View>
        ) : null}
      </View>
    );
  };

  const totalSelected = selections.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ paddingTop: 16 }}
    >
      {/* Header */}
      <View className="flex flex-row items-center justify-between px-4 pb-3">
        <View>
          <Text className="font-semibold text-foreground text-lg">
            MCP Tools
          </Text>
          {totalSelected > 0 && (
            <Text className="text-muted-foreground text-xs">
              {totalSelected} tool{totalSelected !== 1 ? "s" : ""} selected
            </Text>
          )}
        </View>
        <Pressable
          className="rounded-lg bg-primary px-3 py-1.5 active:opacity-80"
          onPress={handleClose}
        >
          <Text className="font-medium text-primary-foreground text-sm">
            Done
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      {enabledServers.length > 0 && (
        <View className="px-4 pb-3">
          <Input
            className="h-9 rounded-lg border-0 bg-muted/50"
            onChangeText={setSearch}
            placeholder="Search tools..."
            ref={inputRef}
            value={search}
          />
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {enabledServers.length > 0
          ? enabledServers.map(renderServer)
          : renderEmptyState()}

        {enabledServers.length > 0 && (
          <View className="mt-2 items-center">
            <Pressable
              className="flex flex-row items-center gap-1 active:opacity-60"
              onPress={openWebSettings}
            >
              <Text className="text-muted-foreground text-xs">
                Manage servers in web settings
              </Text>
              <Icon
                as={ExternalLink}
                className="text-muted-foreground"
                size={10}
              />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
