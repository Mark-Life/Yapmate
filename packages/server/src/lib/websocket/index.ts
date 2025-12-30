/**
 * WebSocket real-time sync module
 * Exports public API for WebSocket management and event publishing
 */

export {
  addConnection,
  broadcast,
  getConnectionCount,
  removeConnection,
} from "./manager";
export {
  closeRedisBridge,
  ensureUserChannelSubscribed,
  initializeRedisBridge,
  publishUserEvent,
} from "./redis-bridge";
export type { WsClientData, WsEvent, WsEventType } from "./types";
