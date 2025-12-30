/**
 * WebSocket event types for real-time sync
 */

export type WsEventType =
  | "chat_created"
  | "chat_updated"
  | "message_created"
  | "stream_started";

export type WsEvent = {
  type: WsEventType;
  chatId?: string;
  hasActiveStream?: boolean;
};

export type WsClientData = {
  userId: string;
};
