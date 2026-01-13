/**
 * WebSocket real-time sync module
 * Exports public API for WebSocket management and event publishing
 */

// User connection management
// Chat room connection management (multi-user)
export {
  addConnection,
  broadcast,
  broadcastToChat,
  getChatConnectionCount,
  getConnectionCount,
  getConnectionUserId,
  getTotalChatRooms,
  joinChat,
  leaveChat,
  removeConnection,
} from "./manager";
export type { PresenceData } from "./redis-bridge";
// Redis bridge - user channels
// Redis bridge - chat channels (multi-user)
// Presence system
// Typing indicators
export {
  closeRedisBridge,
  ensureChatChannelSubscribed,
  ensureUserChannelSubscribed,
  getOnlineMembers,
  initializeRedisBridge,
  maybeUnsubscribeChatChannel,
  publishChatEvent,
  publishTypingEvent,
  publishUserEvent,
  removePresence,
  updatePresence,
} from "./redis-bridge";

// Types
export type {
  WsClientData,
  WsEvent,
  WsEventType,
  WsIncomingMessage,
  WsIncomingMessageType,
} from "./types";
