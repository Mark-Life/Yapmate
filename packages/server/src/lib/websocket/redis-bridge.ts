/**
 * Redis Pub/Sub bridge for WebSocket events
 * Subscribes to user channels and chat channels for multi-user sync
 */

import { createSubscriber, redis } from "../redis/client";
import {
  broadcast,
  broadcastToChat,
  getChatConnectionCount,
  getConnectionCount,
} from "./manager";
import type { WsEvent } from "./types";

let subscriber: Awaited<ReturnType<typeof createSubscriber>> | null = null;
const subscribedChannels = new Set<string>();

/**
 * Initializes Redis subscriber
 * Note: We'll subscribe to individual user/chat channels as needed
 */
export const initializeRedisBridge = async (): Promise<void> => {
  if (subscriber) {
    return;
  }

  subscriber = await createSubscriber();
  console.log("[Redis Bridge] Subscriber initialized");
};

/**
 * Ensures we're subscribed to a user's channel
 * Called when a user connects via WebSocket
 */
export const ensureUserChannelSubscribed = async (
  userId: string
): Promise<void> => {
  if (!subscriber) {
    await initializeRedisBridge();
  }

  const channel = `user:${userId}`;
  if (subscribedChannels.has(channel)) {
    return;
  }

  if (!subscriber) {
    return;
  }

  await subscriber.subscribe(channel, (message) => {
    try {
      const event = JSON.parse(message) as WsEvent;
      broadcast(userId, event);
    } catch (error) {
      console.error(
        `[Redis Bridge] Error parsing message from ${channel}:`,
        error
      );
    }
  });

  subscribedChannels.add(channel);
};

/**
 * Unsubscribes from a user's channel when they disconnect
 * Only unsubscribes if no connections remain for that user
 */
export const maybeUnsubscribeUserChannel = async (
  userId: string
): Promise<void> => {
  // Only unsubscribe if user has no active connections
  if (getConnectionCount(userId) > 0) {
    return;
  }

  const channel = `user:${userId}`;
  if (!(subscribedChannels.has(channel) && subscriber)) {
    return;
  }

  await subscriber.unsubscribe(channel);
  subscribedChannels.delete(channel);
};

/**
 * Publishes an event to Redis for a specific user
 * All server instances will receive this and broadcast to their WebSocket connections
 */
export const publishUserEvent = async (
  userId: string,
  event: WsEvent
): Promise<void> => {
  const channel = `user:${userId}`;
  const payload = JSON.stringify(event);

  try {
    await redis.publish(channel, payload);
  } catch (error) {
    console.error(`[Redis Bridge] Error publishing to ${channel}:`, error);
  }
};

/**
 * Closes the Redis subscriber connection
 */
export const closeRedisBridge = async (): Promise<void> => {
  if (subscriber) {
    // Unsubscribe from all channels
    for (const channel of subscribedChannels) {
      try {
        await subscriber.unsubscribe(channel);
      } catch {
        // Ignore errors during cleanup
      }
    }
    subscribedChannels.clear();
    subscriber.close();
    subscriber = null;
  }
};

// ============================================================================
// Chat Channel Functions (for multi-user sync)
// ============================================================================

/**
 * Ensures we're subscribed to a chat's channel
 * Called when a user joins a chat room
 */
export const ensureChatChannelSubscribed = async (
  chatId: string
): Promise<void> => {
  if (!subscriber) {
    await initializeRedisBridge();
  }

  const channel = `chat:${chatId}`;
  if (subscribedChannels.has(channel)) {
    console.log(`[Redis Bridge] Already subscribed to ${channel}`);
    return;
  }

  if (!subscriber) {
    console.error(`[Redis Bridge] No subscriber available for ${channel}`);
    return;
  }

  console.log(`[Redis Bridge] Subscribing to ${channel}`);
  await subscriber.subscribe(channel, (message) => {
    console.log(`[Redis Bridge] Received message on ${channel}: ${message}`);
    try {
      const event = JSON.parse(message) as WsEvent;
      const connectionCount = getChatConnectionCount(chatId);
      console.log(
        `[Redis Bridge] Broadcasting to chat ${chatId}, connections: ${connectionCount}`
      );
      broadcastToChat(chatId, event);
    } catch (error) {
      console.error(
        `[Redis Bridge] Error parsing message from ${channel}:`,
        error
      );
    }
  });

  subscribedChannels.add(channel);
  console.log(`[Redis Bridge] Subscribed to ${channel}`);
};

/**
 * Unsubscribes from a chat's channel when no connections remain
 */
export const maybeUnsubscribeChatChannel = async (
  chatId: string
): Promise<void> => {
  // Only unsubscribe if chat has no active connections
  if (getChatConnectionCount(chatId) > 0) {
    return;
  }

  const channel = `chat:${chatId}`;
  if (!(subscribedChannels.has(channel) && subscriber)) {
    return;
  }

  await subscriber.unsubscribe(channel);
  subscribedChannels.delete(channel);
};

/**
 * Publishes an event to Redis for all members of a chat
 * All server instances will receive this and broadcast to their WebSocket connections
 */
export const publishChatEvent = async (
  chatId: string,
  event: WsEvent
): Promise<void> => {
  const channel = `chat:${chatId}`;
  const payload = JSON.stringify(event);

  try {
    const result = await redis.publish(channel, payload);
    console.log(
      `[Redis Bridge] Published to ${channel}, subscribers: ${result}`
    );
  } catch (error) {
    console.error(`[Redis Bridge] Error publishing to ${channel}:`, error);
  }
};

// ============================================================================
// Presence System
// ============================================================================

const PRESENCE_TTL_SECONDS = 60;

export type PresenceData = {
  displayName: string;
  lastSeen: number;
};

/**
 * Updates presence for a user in a chat
 * Called on heartbeat (every 30s from client)
 */
export const updatePresence = async (
  chatId: string,
  userId: string,
  displayName: string
): Promise<void> => {
  const key = `chat:${chatId}:presence:${userId}`;
  const data: PresenceData = {
    displayName,
    lastSeen: Date.now(),
  };

  try {
    await redis.set(key, JSON.stringify(data), "EX", PRESENCE_TTL_SECONDS);
  } catch (error) {
    console.error(`[Redis Bridge] Error updating presence for ${key}:`, error);
  }
};

/**
 * Removes presence for a user in a chat (when they explicitly leave)
 */
export const removePresence = async (
  chatId: string,
  userId: string
): Promise<void> => {
  const key = `chat:${chatId}:presence:${userId}`;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Redis Bridge] Error removing presence for ${key}:`, error);
  }
};

/**
 * Gets all online members for a chat
 */
export const getOnlineMembers = async (
  chatId: string
): Promise<Array<{ userId: string; displayName: string }>> => {
  const pattern = `chat:${chatId}:presence:*`;

  try {
    const keys = await redis.keys(pattern);
    const members: Array<{ userId: string; displayName: string }> = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const userId = key.split(":").pop();
        if (!userId) {
          continue;
        }
        const parsed = JSON.parse(data) as PresenceData;
        members.push({ userId, displayName: parsed.displayName });
      }
    }

    return members;
  } catch (error) {
    console.error(
      `[Redis Bridge] Error getting online members for ${chatId}:`,
      error
    );
    return [];
  }
};

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Publishes a typing event to all members of a chat
 */
export const publishTypingEvent = async (
  chatId: string,
  userId: string,
  displayName: string,
  isTyping: boolean
): Promise<void> => {
  console.log(
    `[Redis Bridge] Publishing typing event: chat=${chatId}, user=${userId}, typing=${isTyping}`
  );
  await publishChatEvent(chatId, {
    type: isTyping ? "member_typing" : "member_stopped_typing",
    chatId,
    userId,
    displayName,
  });
};
