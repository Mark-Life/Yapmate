/**
 * Redis Pub/Sub bridge for WebSocket events
 * Subscribes to user channels and broadcasts to WebSocket connections
 */

import { createSubscriber, redis } from "../redis/client";
import { broadcast, getConnectionCount } from "./manager";
import type { WsEvent } from "./types";

let subscriber: Awaited<ReturnType<typeof createSubscriber>> | null = null;
const subscribedChannels = new Set<string>();

/**
 * Initializes Redis subscriber
 * Note: We'll subscribe to individual user channels as needed
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
