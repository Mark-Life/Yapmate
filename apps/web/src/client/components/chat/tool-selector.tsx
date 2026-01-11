/**
 * MCP Tool Selector - allows selecting MCP tools for a chat
 * Shows servers and their tools in a hierarchical popover
 * Controlled component - selections managed by parent
 */

import { useQuery } from "@tanstack/react-query";
import { PromptInputButton } from "@yapmate/components/ai-elements/prompt-input";
import { Badge } from "@yapmate/components/ui/badge";
import { Button } from "@yapmate/components/ui/button";
import { Checkbox } from "@yapmate/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@yapmate/components/ui/collapsible";
import { Input } from "@yapmate/components/ui/input";
import { Kbd, KbdGroup } from "@yapmate/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@yapmate/components/ui/popover";
import { ScrollArea } from "@yapmate/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  SearchIcon,
  ServerIcon,
  WrenchIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { HOTKEYS, splitHotkey } from "../../hooks/use-hotkeys-config";
import type { McpToolSelection } from "../../hooks/use-user-preferences";
import { rpcClient } from "../../lib/rpc-client";
import { navigate } from "../../router";

type ToolSelectorProps = {
  selections: McpToolSelection[];
  onSelectionsChange: (selections: McpToolSelection[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Tool data from server */
type McpTool = {
  id: string;
  mcpServerId: string;
  toolName: string;
  displayName: string;
  description: string | null;
};

/** Server data with tools */
type McpServerWithTools = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  tools: McpTool[];
};

/**
 * Main tool selector component - controlled by parent
 */
export const ToolSelector = ({
  selections,
  onSelectionsChange,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ToolSelectorProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  // Fetch user's MCP servers (cached aggressively - rarely changes)
  const { data: servers = [], isLoading: serversLoading } = useQuery({
    queryKey: ["mcp", "servers"],
    queryFn: () => rpcClient.mcp.servers.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch tools for all servers (cached aggressively - rarely changes)
  const { data: serverToolsMap = {}, isLoading: toolsLoading } = useQuery({
    queryKey: ["mcp", "tools", "all-for-selector"],
    queryFn: async () => {
      const map: Record<string, McpTool[]> = {};
      await Promise.all(
        servers.map(async (server) => {
          try {
            const tools = await rpcClient.mcp.tools.list({
              serverId: server.id,
            });
            map[server.id] = tools;
          } catch {
            map[server.id] = [];
          }
        })
      );
      return map;
    },
    enabled: servers.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Combine servers with their tools
  const serversWithTools: McpServerWithTools[] = useMemo(
    () =>
      servers
        .filter((server) => server.enabled)
        .map((server) => ({
          id: server.id,
          name: server.name,
          url: server.url,
          enabled: server.enabled,
          tools: serverToolsMap[server.id] ?? [],
        })),
    [servers, serverToolsMap]
  );

  // Filter by search query
  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) {
      return serversWithTools;
    }

    const query = searchQuery.toLowerCase();
    return serversWithTools
      .map((server) => ({
        ...server,
        tools: server.tools.filter(
          (tool) =>
            tool.displayName.toLowerCase().includes(query) ||
            tool.toolName.toLowerCase().includes(query) ||
            tool.description?.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (server) =>
          server.name.toLowerCase().includes(query) || server.tools.length > 0
      );
  }, [serversWithTools, searchQuery]);

  // Check if a tool is selected
  const isToolSelected = useCallback(
    (mcpServerId: string, toolName: string): boolean => {
      // Check for explicit tool selection
      const explicit = selections.find(
        (s) => s.mcpServerId === mcpServerId && s.toolName === toolName
      );
      if (explicit) {
        return true;
      }

      // Check for wildcard selection
      const wildcard = selections.find(
        (s) => s.mcpServerId === mcpServerId && s.toolName === "*"
      );
      if (wildcard) {
        return true;
      }

      return false;
    },
    [selections]
  );

  // Check if all tools from a server are selected (via wildcard or all individual)
  const isServerSelected = useCallback(
    (serverId: string, tools: McpTool[]): boolean | "indeterminate" => {
      // Check for wildcard
      const wildcard = selections.find(
        (s) => s.mcpServerId === serverId && s.toolName === "*"
      );
      if (wildcard) {
        return true;
      }

      // Count selected tools
      const selectedCount = tools.filter((tool) =>
        isToolSelected(serverId, tool.toolName)
      ).length;

      if (selectedCount === 0) {
        return false;
      }
      if (selectedCount === tools.length) {
        return true;
      }
      return "indeterminate";
    },
    [selections, isToolSelected]
  );

  // Handle server checkbox toggle
  const handleServerToggle = useCallback(
    (
      serverId: string,
      _tools: McpTool[],
      currentState: boolean | "indeterminate"
    ) => {
      if (currentState === true || currentState === "indeterminate") {
        // Deselect: remove all selections for this server
        const newSelections = selections.filter(
          (s) => s.mcpServerId !== serverId
        );
        onSelectionsChange(newSelections);
      } else {
        // Select all: add wildcard (remove any individual selections first)
        const newSelections = selections.filter(
          (s) => s.mcpServerId !== serverId
        );
        newSelections.push({ mcpServerId: serverId, toolName: "*" });
        onSelectionsChange(newSelections);
      }
    },
    [selections, onSelectionsChange]
  );

  // Handle individual tool toggle
  const handleToolToggle = useCallback(
    (mcpServerId: string, toolName: string, isSelected: boolean) => {
      // Check for wildcard
      const hasWildcard = selections.some(
        (s) => s.mcpServerId === mcpServerId && s.toolName === "*"
      );

      if (hasWildcard) {
        // Remove wildcard and add all tools except this one
        const serverTools =
          serversWithTools.find((s) => s.id === mcpServerId)?.tools ?? [];

        const newSelections = selections.filter(
          (s) => s.mcpServerId !== mcpServerId
        );
        for (const tool of serverTools) {
          if (tool.toolName !== toolName) {
            newSelections.push({ mcpServerId, toolName: tool.toolName });
          }
        }
        onSelectionsChange(newSelections);
      } else if (isSelected) {
        // Remove this tool
        const newSelections = selections.filter(
          (s) => !(s.mcpServerId === mcpServerId && s.toolName === toolName)
        );
        onSelectionsChange(newSelections);
      } else {
        // Add this tool
        const newSelections = [...selections, { mcpServerId, toolName }];
        onSelectionsChange(newSelections);
      }
    },
    [selections, serversWithTools, onSelectionsChange]
  );

  // Count total selected tools
  const selectedCount = useMemo(() => {
    let count = 0;
    for (const server of serversWithTools) {
      const hasWildcard = selections.some(
        (s) => s.mcpServerId === server.id && s.toolName === "*"
      );
      if (hasWildcard) {
        count += server.tools.length;
      } else {
        count += selections.filter(
          (s) => s.mcpServerId === server.id && s.toolName !== "*"
        ).length;
      }
    }
    return count;
  }, [serversWithTools, selections]);

  const isLoading = serversLoading || toolsLoading;
  const hasServers = serversWithTools.length > 0;
  const hasTools = serversWithTools.some((s) => s.tools.length > 0);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <PromptInputButton
              aria-expanded={open}
              aria-label="MCP Tools"
              className="gap-1.5"
              variant={selectedCount > 0 ? "default" : "ghost"}
            >
              <WrenchIcon className="size-4" />
              {selectedCount > 0 ? (
                <Badge className="h-4 min-w-4 px-1 text-[10px] text-primary-foreground">
                  {selectedCount}
                </Badge>
              ) : null}
            </PromptInputButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent hideArrow side="top" sideOffset={45}>
          MCP Tools{" "}
          <KbdGroup>
            {splitHotkey(HOTKEYS.openToolSelector).map((key, idx) => (
              <Kbd key={idx}>{key}</Kbd>
            ))}
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex flex-col">
          {/* Search header */}
          <div className="border-b p-2">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                value={searchQuery}
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-80">
            <div className="p-2">
              <ToolSelectorContent
                filteredServers={filteredServers}
                hasServers={hasServers}
                hasTools={hasTools}
                isLoading={isLoading}
                isServerSelected={isServerSelected}
                isToolSelected={isToolSelected}
                onServerToggle={handleServerToggle}
                onToolToggle={handleToolToggle}
              />
            </div>
          </ScrollArea>

          {/* Footer with hint */}
          {hasTools ? (
            <div className="border-t px-3 py-2">
              <p className="text-muted-foreground text-xs">
                Selected tools will be available to the AI in this chat
              </p>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** Content area - separated for complexity reduction */
const ToolSelectorContent = ({
  isLoading,
  hasServers,
  hasTools,
  filteredServers,
  isServerSelected,
  isToolSelected,
  onServerToggle,
  onToolToggle,
}: {
  isLoading: boolean;
  hasServers: boolean;
  hasTools: boolean;
  filteredServers: McpServerWithTools[];
  isServerSelected: (
    serverId: string,
    tools: McpTool[]
  ) => boolean | "indeterminate";
  isToolSelected: (mcpServerId: string, toolName: string) => boolean;
  onServerToggle: (
    serverId: string,
    tools: McpTool[],
    currentState: boolean | "indeterminate"
  ) => void;
  onToolToggle: (
    mcpServerId: string,
    toolName: string,
    isSelected: boolean
  ) => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasServers) {
    return (
      <EmptyState
        action={{
          label: "Add MCP server",
          onClick: () => navigate("/settings/mcp"),
        }}
        description="Add MCP servers in Settings to use tools"
        title="No MCP servers"
      />
    );
  }

  if (!hasTools) {
    return (
      <EmptyState
        description="Sync tools from your MCP servers in Settings"
        title="No tools available"
      />
    );
  }

  if (filteredServers.length === 0) {
    return (
      <EmptyState
        description="Try a different search term"
        title="No matching tools"
      />
    );
  }

  return (
    <div className="space-y-1">
      {filteredServers.map((server) => (
        <ServerSection
          isServerSelected={isServerSelected}
          isToolSelected={isToolSelected}
          key={server.id}
          onServerToggle={onServerToggle}
          onToolToggle={onToolToggle}
          server={server}
        />
      ))}
    </div>
  );
};

/** Empty state component */
const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <ServerIcon className="size-8 text-muted-foreground/50" />
    <p className="font-medium text-sm">{title}</p>
    <p className="text-muted-foreground text-xs">{description}</p>
    {action ? (
      <Button onClick={action.onClick} size="sm" variant="default">
        {action.label}
      </Button>
    ) : null}
  </div>
);

/** Server section with collapsible tools */
const ServerSection = ({
  server,
  isServerSelected,
  isToolSelected,
  onServerToggle,
  onToolToggle,
}: {
  server: McpServerWithTools;
  isServerSelected: (
    serverId: string,
    tools: McpTool[]
  ) => boolean | "indeterminate";
  isToolSelected: (mcpServerId: string, toolName: string) => boolean;
  onServerToggle: (
    serverId: string,
    tools: McpTool[],
    currentState: boolean | "indeterminate"
  ) => void;
  onToolToggle: (
    mcpServerId: string,
    toolName: string,
    isSelected: boolean
  ) => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const serverState = isServerSelected(server.id, server.tools);
  const hasTools = server.tools.length > 0;
  const checkboxId = `server-${server.id}`;

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
        <CollapsibleTrigger asChild disabled={!hasTools}>
          <button
            className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            type="button"
          >
            {isOpen ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </button>
        </CollapsibleTrigger>

        <Checkbox
          checked={serverState === true}
          data-state={
            serverState === "indeterminate" ? "indeterminate" : undefined
          }
          disabled={!hasTools}
          id={checkboxId}
          onCheckedChange={() =>
            onServerToggle(server.id, server.tools, serverState)
          }
        />

        <label
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
          htmlFor={checkboxId}
        >
          <ServerIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium text-sm">{server.name}</span>
          <span className="shrink-0 text-muted-foreground text-xs">
            ({server.tools.length})
          </span>
        </label>
      </div>

      <CollapsibleContent>
        <div className="ml-7 space-y-0.5 border-l pl-2">
          {server.tools.map((tool) => {
            const selected = isToolSelected(server.id, tool.toolName);
            return (
              <ToolItem
                isSelected={selected}
                key={tool.id}
                onToggle={() =>
                  onToolToggle(server.id, tool.toolName, selected)
                }
                tool={tool}
              />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** Individual tool item */
const ToolItem = ({
  tool,
  isSelected,
  onToggle,
}: {
  tool: McpTool;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  const checkboxId = `tool-${tool.id}`;

  return (
    <div className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        id={checkboxId}
        onCheckedChange={onToggle}
      />
      <label
        className="flex min-w-0 flex-1 cursor-pointer flex-col"
        htmlFor={checkboxId}
      >
        <span className="truncate text-sm">{tool.displayName}</span>
        {tool.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="line-clamp-2 text-muted-foreground text-xs">
                {tool.description}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="right">
              {tool.description}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </label>
    </div>
  );
};
