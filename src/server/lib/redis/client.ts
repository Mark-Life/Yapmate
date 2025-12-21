/**
 * Redis client singleton for stream operations
 * Uses Bun's native Redis client with Upstash
 */
import { RedisClient } from "bun";

// Uses REDIS_URL env var by default (Upstash connection string)
export const redis = new RedisClient(process.env.REDIS_URL);

// For Pub/Sub subscribers (need separate connection)
export const createSubscriber = async () => {
  const subscriber = new RedisClient(process.env.REDIS_URL);
  await subscriber.connect();
  return subscriber;
};
