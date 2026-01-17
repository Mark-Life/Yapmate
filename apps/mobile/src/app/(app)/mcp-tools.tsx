import { GlassView } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ExternalLink, Server } from "lucide-react-native";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useMcpServers, useMcpToolsForServers } from "@/hooks/use-mcp";
import type { McpToolSelection } from "@/hooks/use-user-preferences";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";

type McpServer = {
  id: string;
  name: string;
  enabled: boolean;
};

type McpTool = {
  id: string;
  mcpServerId: string;
  toolName: string;
  displayName: string;
  description: string | null;
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
   * Checks if server has wildcard selection (all tools)
   */
  const isServerWildcard = useCallback(
    (serverId: string) =>
      selections.some((s) => s.mcpServerId === serverId && s.toolName === "*"),
    [selections]
  );

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
   * Toggles server wildcard selection (all tools)
   */
  const toggleServerWildcard = (serverId: string) => {
    lightTap();
    setSelections((prev) => {
      const hasWildcard = prev.some(
        (s) => s.mcpServerId === serverId && s.toolName === "*"
      );
      if (hasWildcard) {
        // Remove wildcard (deselect all)
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
      const hasWildcard = prev.some(
        (s) => s.mcpServerId === serverId && s.toolName === "*"
      );
      if (hasWildcard) {
        const serverTools = (toolsMap.get(serverId) ?? []) as McpTool[];
        return [
          ...prev.filter((s) => s.mcpServerId !== serverId),
          ...serverTools
            .filter((t) => t.toolName !== toolName)
            .map((t) => ({ mcpServerId: serverId, toolName: t.toolName })),
        ];
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
   * Filter by search query (searches both servers and tools)
   */
  const filterBySearch = useCallback(
    (serverId: string, serverName: string) => {
      if (!search.trim()) {
        return true;
      }
      const query = search.toLowerCase();
      // Match server name
      if (serverName.toLowerCase().includes(query)) {
        return true;
      }
      // Match any tool name/description
      const tools = (toolsMap.get(serverId) ?? []) as McpTool[];
      return tools.some(
        (t: McpTool) =>
          t.toolName.toLowerCase().includes(query) ||
          t.displayName.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    },
    [search, toolsMap]
  );

  /**
   * Filter tools by search query
   */
  const filterTools = useCallback(
    (serverId: string, serverName: string): McpTool[] => {
      const tools = (toolsMap.get(serverId) ?? []) as McpTool[];
      if (!search.trim()) {
        return tools;
      }
      const query = search.toLowerCase();
      // If server name matches, show all tools
      if (serverName.toLowerCase().includes(query)) {
        return tools;
      }
      // Otherwise filter tools
      return tools.filter(
        (t) =>
          t.toolName.toLowerCase().includes(query) ||
          t.displayName.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    },
    [search, toolsMap]
  );

  const filteredServers = useMemo(
    () => enabledServers.filter((s) => filterBySearch(s.id, s.name)),
    [enabledServers, filterBySearch]
  );

  /**
   * Opens web settings for server management
   */
  const openWebSettings = () => {
    Linking.openURL("https://yapmate.com/settings/mcp");
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
   * Renders a server section with header and tools
   */
  const renderServer = (server: McpServer, isLast: boolean) => {
    const tools = toolsMap.get(server.id) ?? [];
    const filteredToolsList = filterTools(server.id, server.name);
    const hasWildcard = isServerWildcard(server.id);

    return (
      <View className={isLast ? "" : "mb-4"} key={server.id}>
        {/* Server header */}
        <Pressable
          className="flex flex-row items-center gap-3 rounded-t-md border border-border border-b-0 px-3 py-3 active:bg-accent"
          onPress={() => toggleServerWildcard(server.id)}
        >
          <Checkbox
            checked={hasWildcard}
            className="size-5"
            onCheckedChange={() => toggleServerWildcard(server.id)}
          />
          <Icon as={Server} className="text-muted-foreground" size={18} />
          <View className="flex-1">
            <Text
              className="font-semibold text-foreground text-sm"
              numberOfLines={1}
            >
              {server.name}
            </Text>
            <Text className="mt-0.5 text-muted-foreground text-xs">
              {tools.length} tool{tools.length !== 1 ? "s" : ""} • Select all
            </Text>
          </View>
        </Pressable>

        {/* Tools list - indented content */}
        <View className="rounded-b-md border border-border border-t-0">
          {filteredToolsList.length > 0 ? (
            filteredToolsList.map((tool, idx) => (
              <View key={tool.id}>
                <Pressable
                  className="flex flex-row items-center gap-3 py-2.5 pr-3 pl-6 active:bg-accent"
                  onPress={() => toggleTool(server.id, tool.toolName)}
                >
                  <Checkbox
                    checked={isToolSelected(server.id, tool.toolName)}
                    className="size-5"
                    onCheckedChange={() => toggleTool(server.id, tool.toolName)}
                  />
                  <View className="flex-1">
                    <Text className="text-foreground text-sm" numberOfLines={1}>
                      {tool.displayName}
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
                {idx < filteredToolsList.length - 1 && (
                  <View className="h-px bg-border" />
                )}
              </View>
            ))
          ) : (
            <View className="px-3 py-3 pl-6">
              <Text className="text-muted-foreground text-xs">
                No tools available
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const totalSelected = selections.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex flex-row items-center justify-between p-6 pb-4">
          <View className="flex flex-row items-center gap-2">
            <Text className="font-semibold text-foreground text-lg">
              MCP Tools
            </Text>
            {totalSelected > 0 && (
              <Text className="text-muted-foreground text-xs">
                {totalSelected} server{totalSelected !== 1 ? "s" : ""} selected
              </Text>
            )}
          </View>
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Button
              aria-label="Done"
              className="bg-muted"
              onPress={() => {
                lightTap();
                handleClose();
              }}
              size="icon"
              variant="ghost"
            >
              <Icon as={Check} className="size-6 text-primary" />
            </Button>
          </GlassView>
        </View>

        {/* Search */}
        {enabledServers.length > 0 && (
          <View className="px-6 pb-4">
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 12,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <Input
                className="rounded-md border-input bg-transparent"
                onChangeText={setSearch}
                placeholder="Search servers..."
                ref={inputRef}
                value={search}
              />
            </GlassView>
          </View>
        )}

        {/* Server list */}
        <View className="px-6">
          {enabledServers.length === 0 && renderEmptyState()}
          {enabledServers.length > 0 && isLoadingTools && (
            <View className="items-center justify-center px-4 py-12">
              <Text className="text-muted-foreground text-sm">
                Loading tools...
              </Text>
            </View>
          )}
          {enabledServers.length > 0 &&
            !isLoadingTools &&
            filteredServers.length === 0 && (
              <View className="rounded-lg border border-border px-4 py-2">
                <Text className="text-muted-foreground text-sm">
                  No matches for "{search}"
                </Text>
              </View>
            )}
          {!isLoadingTools &&
            filteredServers.map((server, index) =>
              renderServer(server, index === filteredServers.length - 1)
            )}

          {/* {enabledServers.length > 0 && (
            <View className="mt-4 items-center">
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
          )} */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
