/**
 * Request-scoped isolation for MCP operations
 * Uses AsyncLocalStorage to prevent accidental global state sharing between requests
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Context for MCP operations within a request
 */
export type McpRequestContext = {
  userId: string;
  chatId: string;
  requestId: string;
};

/**
 * AsyncLocalStorage instance for MCP request context
 */
export const mcpContext = new AsyncLocalStorage<McpRequestContext>();

/**
 * Run a function within an MCP request context
 * @param context - The context to use
 * @param fn - Function to run within the context
 * @returns Result of the function
 */
export const runInMcpContext = <T>(
  context: McpRequestContext,
  fn: () => Promise<T>
): Promise<T> => mcpContext.run(context, fn);

/**
 * Get the current MCP request context (if any)
 * @returns Current context or undefined
 */
export const getMcpContext = () => mcpContext.getStore();

/**
 * Create a new MCP request context
 * @param userId - The user ID
 * @param chatId - The chat ID
 * @returns New context with generated request ID
 */
export const createMcpContext = (
  userId: string,
  chatId: string
): McpRequestContext => ({
  userId,
  chatId,
  requestId: randomUUID(),
});
