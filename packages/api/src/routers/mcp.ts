/**
 * MCP router - Model Context Protocol server and tool management
 */

import { ORPCError } from "@orpc/server";
import {
  addChatToolInputSchema,
  addMcpServerInputSchema,
  chatToolSelectionSchema,
  mcpServerSelectSchema,
  mcpToolSelectSchema,
  removeChatToolInputSchema,
  setChatToolSelectionsInputSchema,
  testMcpServerInputSchema,
  updateMcpServerInputSchema,
} from "@yapmate/db/schema";
import {
  addChatToolSelection,
  addMcpServer,
  deleteMcpServer,
  fetchAndSyncMcpTools,
  getCachedTools,
  getChatToolSelections,
  getMcpServer,
  getUserMcpServers,
  removeChatToolSelection,
  setChatToolSelections,
  testMcpConnection,
  toggleMcpServer,
  updateMcpServer,
  validateMcpUrl,
} from "@yapmate/server/lib/mcp";
import { getChat } from "@yapmate/server/routes/api/chat/store";
import { z } from "zod";
import { protectedProcedure } from "../middleware";

/**
 * MCP router - handles MCP server CRUD, tool discovery, and chat tool selection
 */
export const mcp = {
  /**
   * MCP Server operations
   */
  servers: {
    /**
     * List all MCP servers for the current user
     */
    list: protectedProcedure
      .output(z.array(mcpServerSelectSchema))
      .handler(async ({ context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        return await getUserMcpServers(context.userId);
      }),

    /**
     * Get single MCP server by ID
     */
    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .output(mcpServerSelectSchema.nullable())
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        return await getMcpServer(context.userId, input.id);
      }),

    /**
     * Create new MCP server
     */
    create: protectedProcedure
      .input(addMcpServerInputSchema)
      .output(mcpServerSelectSchema)
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        return await addMcpServer(context.userId, input);
      }),

    /**
     * Update MCP server configuration
     */
    update: protectedProcedure
      .input(updateMcpServerInputSchema)
      .output(mcpServerSelectSchema)
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        const { id, ...updateData } = input;
        return await updateMcpServer(context.userId, id, updateData);
      }),

    /**
     * Delete MCP server
     */
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .output(z.object({ success: z.boolean() }))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        await deleteMcpServer(context.userId, input.id);
        return { success: true };
      }),

    /**
     * Toggle MCP server enabled/disabled
     */
    toggle: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          enabled: z.boolean(),
        })
      )
      .output(z.object({ success: z.boolean() }))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }
        await toggleMcpServer(context.userId, input.id, input.enabled);
        return { success: true };
      }),

    /**
     * Test MCP server connection (without saving)
     */
    test: protectedProcedure
      .input(testMcpServerInputSchema)
      .output(
        z.object({
          success: z.boolean(),
          error: z.string().optional(),
          toolCount: z.number().optional(),
          tools: z
            .array(
              z.object({
                name: z.string(),
                description: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .handler(async ({ input }) => {
        // Validate URL before testing
        const urlValidation = await validateMcpUrl(input.url);
        if (!urlValidation.valid) {
          return {
            success: false,
            error: urlValidation.reason,
          };
        }

        return await testMcpConnection({
          id: "", // Not used for testing
          userId: "", // Not used for testing
          name: "", // Not used for testing
          url: input.url,
          transportType: input.transportType,
          authType: input.authType,
          authHeaderName: input.authHeaderName ?? null,
          apiKey: input.apiKey ?? null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
  },

  /**
   * Tool discovery operations
   */
  tools: {
    /**
     * List cached tools for an MCP server
     */
    list: protectedProcedure
      .input(z.object({ serverId: z.string().uuid() }))
      .output(z.array(mcpToolSelectSchema))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify server ownership
        const server = await getMcpServer(context.userId, input.serverId);
        if (!server) {
          throw new ORPCError("NOT_FOUND", {
            message: "MCP server not found",
          });
        }

        return await getCachedTools(input.serverId);
      }),

    /**
     * Sync tools from MCP server (fetch and cache)
     */
    sync: protectedProcedure
      .input(z.object({ serverId: z.string().uuid() }))
      .output(z.array(mcpToolSelectSchema))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify server ownership
        const server = await getMcpServer(context.userId, input.serverId);
        if (!server) {
          throw new ORPCError("NOT_FOUND", {
            message: "MCP server not found",
          });
        }

        try {
          return await fetchAndSyncMcpTools(context.userId, input.serverId);
        } catch (error) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message:
              error instanceof Error
                ? error.message
                : "Failed to sync tools from MCP server",
          });
        }
      }),
  },

  /**
   * Chat tool selection operations
   */
  chat: {
    /**
     * Get tool selections for a chat
     */
    getSelections: protectedProcedure
      .input(z.object({ chatId: z.string().uuid() }))
      .output(z.array(chatToolSelectionSchema))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify chat ownership
        const chat = await getChat(input.chatId);
        if (!chat) {
          throw new ORPCError("NOT_FOUND", {
            message: "Chat not found",
          });
        }
        if (chat.userId !== context.userId) {
          throw new ORPCError("FORBIDDEN", {
            message: "Forbidden",
          });
        }

        return await getChatToolSelections(input.chatId);
      }),

    /**
     * Set tool selections for a chat (replaces existing)
     */
    setSelections: protectedProcedure
      .input(setChatToolSelectionsInputSchema)
      .output(z.object({ success: z.boolean() }))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify chat ownership
        const chat = await getChat(input.chatId);
        if (!chat) {
          throw new ORPCError("NOT_FOUND", {
            message: "Chat not found",
          });
        }
        if (chat.userId !== context.userId) {
          throw new ORPCError("FORBIDDEN", {
            message: "Forbidden",
          });
        }

        await setChatToolSelections(input.chatId, input.selections);
        return { success: true };
      }),

    /**
     * Add tool selection to chat
     */
    addTool: protectedProcedure
      .input(addChatToolInputSchema)
      .output(z.object({ success: z.boolean() }))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify chat ownership
        const chat = await getChat(input.chatId);
        if (!chat) {
          throw new ORPCError("NOT_FOUND", {
            message: "Chat not found",
          });
        }
        if (chat.userId !== context.userId) {
          throw new ORPCError("FORBIDDEN", {
            message: "Forbidden",
          });
        }

        await addChatToolSelection(input.chatId, {
          mcpServerId: input.mcpServerId,
          toolName: input.toolName,
        });
        return { success: true };
      }),

    /**
     * Remove tool selection from chat
     */
    removeTool: protectedProcedure
      .input(removeChatToolInputSchema)
      .output(z.object({ success: z.boolean() }))
      .handler(async ({ input, context }) => {
        if (!context.userId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "User ID not available",
          });
        }

        // Verify chat ownership
        const chat = await getChat(input.chatId);
        if (!chat) {
          throw new ORPCError("NOT_FOUND", {
            message: "Chat not found",
          });
        }
        if (chat.userId !== context.userId) {
          throw new ORPCError("FORBIDDEN", {
            message: "Forbidden",
          });
        }

        await removeChatToolSelection(
          input.chatId,
          input.mcpServerId,
          input.toolName
        );
        return { success: true };
      }),
  },
};
