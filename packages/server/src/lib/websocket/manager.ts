/**
 * WebSocket connection manager
 * Tracks user connections for broadcasting events
 */

import type { ServerWebSocket } from "bun";
import { maybeUnsubscribeUserChannel } from "./redis-bridge";
import type { WsClientData, WsEvent } from "./types";

/**
 * Map of userId -> Set of WebSocket connections
 */
const userConnections = new Map<string, Set<ServerWebSocket<WsClientData>>>();

/**
 * Adds a WebSocket connection for a user
 */
export const addConnection = async (
  userId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  const connections = userConnections.get(userId) ?? new Set();
  connections.add(ws);
  userConnections.set(userId, connections);

  // Ensure Redis channel is subscribed
  const { ensureUserChannelSubscribed } = await import("./redis-bridge");
  await ensureUserChannelSubscribed(userId);
};

/**
 * Removes a WebSocket connection for a user
 */
export const removeConnection = async (
  userId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  const connections = userConnections.get(userId);
  if (!connections) {
    return;
  }

  connections.delete(ws);

  // Clean up empty sets
  if (connections.size === 0) {
    userConnections.delete(userId);
    // Unsubscribe from Redis channel if no connections remain
    await maybeUnsubscribeUserChannel(userId);
  }
};

/**
 * Broadcasts an event to all connections for a user
 */
export const broadcast = (userId: string, event: WsEvent): void => {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    return;
  }

  const payload = JSON.stringify(event);
  const deadConnections: ServerWebSocket<WsClientData>[] = [];

  for (const ws of connections) {
    try {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(payload);
      } else {
        deadConnections.push(ws);
      }
    } catch (error) {
      console.error(`[WS] Error sending to user ${userId}:`, error);
      deadConnections.push(ws);
    }
  }

  // Clean up dead connections
  for (const ws of deadConnections) {
    removeConnection(userId, ws);
  }
};

/**
 * Gets the number of active connections for a user
 */
export const getConnectionCount = (userId: string): number =>
  userConnections.get(userId)?.size ?? 0;

/**
 * Gets total number of connected users
 */
export const getTotalUsers = (): number => userConnections.size;
