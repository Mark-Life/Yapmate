/**
 * Redis stream operations for resumable streams
 * Handles buffering, Pub/Sub, and status management
 */
import { createSubscriber, redis } from "./redis-client";

const STREAM_TTL = 3600; // 1 hour

export type StreamChunk = {
  type: string;
  data: unknown;
  index: number;
};

export type StreamStatus = "streaming" | "complete" | "aborted" | "error";

/**
 * Publishes chunk to buffer and Pub/Sub
 * @param streamId - Stream identifier
 * @param chunk - Chunk data to publish
 */
export const publishStreamChunk = async (
  streamId: string,
  chunk: StreamChunk
): Promise<void> => {
  const bufferKey = `stream:${streamId}:buffer`;
  const channel = `stream:${streamId}`;
  const payload = JSON.stringify(chunk);

  await Promise.all([
    redis.send("RPUSH", [bufferKey, payload]),
    redis.publish(channel, payload),
  ]);
};

/**
 * Sets stream status with TTL
 * @param streamId - Stream identifier
 * @param status - Status to set
 */
export const setStreamStatus = async (
  streamId: string,
  status: StreamStatus
): Promise<void> => {
  const statusKey = `stream:${streamId}:status`;
  const bufferKey = `stream:${streamId}:buffer`;

  await redis.set(statusKey, status);
  await redis.expire(statusKey, STREAM_TTL);
  await redis.expire(bufferKey, STREAM_TTL);
};

/**
 * Gets buffered chunks from index
 * @param streamId - Stream identifier
 * @param fromIndex - Starting index (default: 0)
 * @returns Array of buffered chunks
 */
export const getBufferedChunks = async (
  streamId: string,
  fromIndex = 0
): Promise<StreamChunk[]> => {
  const key = `stream:${streamId}:buffer`;
  const chunks = await redis.send("LRANGE", [key, String(fromIndex), "-1"]);
  return (chunks as string[]).map((c) => JSON.parse(c));
};

/**
 * Gets current stream status
 * @param streamId - Stream identifier
 * @returns Current status or null if not found
 */
export const getStreamStatus = async (
  streamId: string
): Promise<StreamStatus | null> =>
  (await redis.get(`stream:${streamId}:status`)) as StreamStatus | null;

/**
 * Subscribe to live stream chunks
 * @param streamId - Stream identifier
 * @param onChunk - Callback for each chunk
 * @returns Cleanup function to unsubscribe
 */
export const subscribeToStream = async (
  streamId: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<() => Promise<void>> => {
  const subscriber = await createSubscriber();
  const channel = `stream:${streamId}`;

  await subscriber.subscribe(channel, (message) => {
    onChunk(JSON.parse(message));
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    subscriber.close();
  };
};

/**
 * Cleans up stream data from Redis
 * @param streamId - Stream identifier
 */
export const cleanupStream = async (streamId: string): Promise<void> => {
  await redis.del(`stream:${streamId}:status`);
  await redis.del(`stream:${streamId}:buffer`);
};
