/**
 * MCP client creation and tool fetching
 * Handles MCP client lifecycle and tool conversion
 */

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { McpServerWithSecrets } from "./types";

/**
 * Create MCP client from server config
 * @param config - MCP server configuration with secrets
 * @returns MCP client instance
 */
export const createMcpClientFromConfig = async (
  config: McpServerWithSecrets
) => {
  const headers: Record<string, string> = {};

  // Add authentication header if needed
  if (config.apiKey && config.authType !== "none") {
    if (config.authType === "bearer") {
      headers.Authorization = `Bearer ${config.apiKey}`;
    } else if (config.authType === "api-key" && config.authHeaderName) {
      headers[config.authHeaderName] = config.apiKey;
    }
  }

  const transportConfig =
    config.transportType === "sse"
      ? {
          type: "sse" as const,
          url: config.url,
          headers,
        }
      : {
          type: "http" as const,
          url: config.url,
          headers,
        };

  return await createMCPClient({
    transport: transportConfig,
  });
};

/**
 * Test MCP connection and return available tools
 * @param config - MCP server configuration with secrets
 * @returns Connection test result with tool count and list
 */
export const testMcpConnection = async (config: McpServerWithSecrets) => {
  let client: MCPClient | undefined;

  try {
    client = await createMcpClientFromConfig(config);

    // Fetch tools from server
    const tools = await client.tools();

    const toolNames = Object.keys(tools);
    const toolList = toolNames.map((name) => {
      const tool = tools[name];
      return {
        name,
        description: tool.description,
      };
    });

    return {
      success: true,
      toolCount: toolNames.length,
      tools: toolList,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client?.close();
  }
};

/**
 * Fetch tools from MCP client (filtered by selection)
 * @param client - MCP client instance
 * @param selectedTools - Optional array of tool names to include (undefined = all tools)
 * @returns AI SDK tool format object
 */
export const fetchMcpTools = async (
  client: MCPClient,
  selectedTools?: string[]
) => {
  const allTools = await client.tools();

  // If no selection specified, return all tools
  if (!selectedTools) {
    return allTools;
  }

  // Filter tools by selection
  const filtered: Record<string, unknown> = {};
  for (const toolName of selectedTools) {
    if (toolName in allTools) {
      filtered[toolName] = allTools[toolName];
    }
  }

  return filtered;
};
