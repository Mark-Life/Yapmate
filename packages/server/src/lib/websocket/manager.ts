/**
 * WebSocket connection manager
 * Tracks user connections and chat room memberships for broadcasting events
 */

import type { ServerWebSocket } from "bun";
import {
  ensureChatChannelSubscribed,
  maybeUnsubscribeChatChannel,
  maybeUnsubscribeUserChannel,
  removePresence,
} from "./redis-bridge";
import type { WsClientData, WsEvent } from "./types";

/**
 * Map of userId -> Set of WebSocket connections
 */
const userConnections = new Map<string, Set<ServerWebSocket<WsClientData>>>();

/**
 * Map of chatId -> Set of WebSocket connections (for multi-user chat rooms)
 */
const chatConnections = new Map<string, Set<ServerWebSocket<WsClientData>>>();

/**
 * Track which chats each connection is watching (for cleanup on disconnect)
 */
const connectionChats = new WeakMap<
  ServerWebSocket<WsClientData>,
  Set<string>
>();

/**
 * Track userId for each connection (for cleanup on disconnect)
 */
const connectionUserId = new WeakMap<ServerWebSocket<WsClientData>, string>();

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

  // Track userId on connection for cleanup
  connectionUserId.set(ws, userId);

  // Ensure Redis channel is subscribed
  const { ensureUserChannelSubscribed } = await import("./redis-bridge");
  await ensureUserChannelSubscribed(userId);
};

/**
 * Removes a WebSocket connection for a user
 * Also cleans up any chat room memberships
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

  // Clean up chat room memberships for this connection
  const chats = connectionChats.get(ws);
  if (chats) {
    for (const chatId of chats) {
      await leaveChatInternal(chatId, ws, userId);
    }
  }

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

// ============================================================================
// Chat Room Connection Management (for multi-user sync)
// ============================================================================

/**
 * Adds a WebSocket connection to a chat room
 * Called when a user opens a chat
 */
export const joinChat = async (
  chatId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  // Add to chat connections
  const connections = chatConnections.get(chatId) ?? new Set();
  connections.add(ws);
  chatConnections.set(chatId, connections);

  // Track which chats this connection is in
  const chats = connectionChats.get(ws) ?? new Set();
  chats.add(chatId);
  connectionChats.set(ws, chats);

  // Subscribe to chat channel in Redis
  await ensureChatChannelSubscribed(chatId);
};

/**
 * Internal leave chat logic (doesn't modify connectionChats - used during cleanup)
 */
const leaveChatInternal = async (
  chatId: string,
  ws: ServerWebSocket<WsClientData>,
  userId: string
): Promise<void> => {
  // Remove from chat connections
  const connections = chatConnections.get(chatId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      chatConnections.delete(chatId);
    }
  }

  // Remove presence from Redis
  await removePresence(chatId, userId);

  // Unsubscribe from Redis channel if no connections remain
  await maybeUnsubscribeChatChannel(chatId);
};

/**
 * Removes a WebSocket connection from a chat room
 * Called when a user closes a chat
 */
export const leaveChat = async (
  chatId: string,
  ws: ServerWebSocket<WsClientData>
): Promise<void> => {
  const userId = connectionUserId.get(ws);
  if (!userId) {
    return;
  }

  // Update connection's chat list
  const chats = connectionChats.get(ws);
  if (chats) {
    chats.delete(chatId);
  }

  await leaveChatInternal(chatId, ws, userId);
};

/**
 * Broadcasts an event to all connections in a chat room
 */
export const broadcastToChat = (chatId: string, event: WsEvent): void => {
  const connections = chatConnections.get(chatId);
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
      console.error(`[WS] Error sending to chat ${chatId}:`, error);
      deadConnections.push(ws);
    }
  }

  // Clean up dead connections
  for (const ws of deadConnections) {
    const userId = connectionUserId.get(ws);
    if (userId) {
      removeConnection(userId, ws);
    }
  }
};

/**
 * Gets the number of active connections for a chat
 */
export const getChatConnectionCount = (chatId: string): number =>
  chatConnections.get(chatId)?.size ?? 0;

/**
 * Gets total number of active chat rooms
 */
export const getTotalChatRooms = (): number => chatConnections.size;

/**
 * Gets the userId for a WebSocket connection
 */
export const getConnectionUserId = (
  ws: ServerWebSocket<WsClientData>
): string | undefined => connectionUserId.get(ws);
