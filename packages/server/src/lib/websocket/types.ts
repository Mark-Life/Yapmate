/**
 * WebSocket event types for real-time sync
 */

export type WsEventType =
  // Existing events
  | "chat_created"
  | "chat_updated"
  | "message_created"
  | "stream_started"
  | "stream_active"
  // Multi-user events
  | "member_joined"
  | "member_left"
  | "member_updated"
  | "member_typing"
  | "member_stopped_typing"
  | "presence_update"
  | "stream_chunk";

export type WsEvent = {
  type: WsEventType;
  chatId?: string;
  userId?: string;
  displayName?: string;
  hasActiveStream?: boolean;
  // For stream_active event (late joiner notification)
  streamId?: string;
  // For stream chunks
  chunk?: unknown;
  chunkIndex?: number;
  // For presence
  onlineMembers?: Array<{ userId: string; displayName: string }>;
};

export type WsClientData = {
  userId: string;
};

/**
 * Incoming WebSocket message types from clients
 */
export type WsIncomingMessageType =
  | "join_chat"
  | "leave_chat"
  | "heartbeat"
  | "typing"
  | "stop_typing";

export type WsIncomingMessage = {
  type: WsIncomingMessageType;
  chatId: string;
  displayName?: string;
};
