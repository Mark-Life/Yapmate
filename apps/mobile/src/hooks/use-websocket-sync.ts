/**
 * WebSocket real-time sync hook for mobile
 * Connects to server WebSocket and handles real-time events
 */

import type { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type WsEvent = {
  type: "chat_created" | "chat_updated" | "message_created" | "stream_started";
  chatId?: string;
  hasActiveStream?: boolean;
};

type UseWebSocketSyncOptions = {
  wsUrl: string;
  getToken: () => Promise<string | null>;
  queryClient: ReturnType<typeof useQueryClient>;
  currentChatId?: string;
  onStreamStarted?: (chatId: string) => void;
  enabled?: boolean;
};

/**
 * WebSocket real-time sync hook
 * Handles connection, reconnection, and event processing
 */
export const useWebSocketSync = (options: UseWebSocketSyncOptions): void => {
  const {
    wsUrl,
    getToken,
    queryClient,
    currentChatId,
    onStreamStarted,
    enabled = true,
  } = options;

  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isConnectingRef = useRef(false);

  /**
   * Calculates exponential backoff delay
   */
  const getReconnectDelay = (attempts: number): number => {
    return Math.min(1000 * 2 ** attempts, 30_000); // Max 30s
  };

  /**
   * Handles WebSocket messages and dispatches events
   */
  const handleMessage = (data: WsEvent | { type: "pong" }): void => {
    // Handle pong
    if (data.type === "pong") {
      return;
    }

    // Handle real-time events
    switch (data.type) {
      case "chat_created":
        // Invalidate chats list to show new chat in sidebar
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        break;

      case "chat_updated":
        // Invalidate chats list and current chat if it's the updated one
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        if (data.chatId === currentChatId) {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", data.chatId],
          });
        }
        break;

      case "message_created":
        // Invalidate messages for the chat
        if (data.chatId) {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", data.chatId],
          });
        }
        break;

      case "stream_started":
        // Trigger stream resume if viewing this chat
        if (data.chatId && data.chatId === currentChatId && onStreamStarted) {
          onStreamStarted(data.chatId);
        }
        break;

      default:
        // Unknown event type, ignore
        break;
    }
  };

  /**
   * Connects to WebSocket server
   */
  const connect = async (): Promise<void> => {
    if (
      !enabled ||
      isConnectingRef.current ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const token = await getToken();
      if (!token) {
        console.warn("[WS] No token available, skipping connection");
        isConnectingRef.current = false;
        return;
      }

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Connect with token as query parameter
      const url = new URL(wsUrl);
      url.searchParams.set("token", token);
      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        // console.log("[WS] Connected");
        isConnectingRef.current = false;
        setReconnectAttempts(0);

        // Send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30_000); // Ping every 30s

        // Store ping interval cleanup
        (
          ws as unknown as { _pingInterval?: ReturnType<typeof setInterval> }
        )._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent | { type: "pong" };
          handleMessage(data);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      ws.onerror = () => {
        console.error("[WS] Error");
        isConnectingRef.current = false;
      };

      ws.onclose = () => {
        // console.log("[WS] Disconnected");
        isConnectingRef.current = false;

        // Clear ping interval
        const pingInterval = (
          ws as unknown as { _pingInterval?: ReturnType<typeof setInterval> }
        )._pingInterval;
        if (pingInterval) {
          clearInterval(pingInterval);
        }

        // Attempt reconnection if enabled
        if (enabled) {
          const delay = getReconnectDelay(reconnectAttempts);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WS] Connection error:", error);
      isConnectingRef.current = false;

      // Attempt reconnection
      if (enabled) {
        const delay = getReconnectDelay(reconnectAttempts);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, delay);
      }
    }
  };

  /**
   * Disconnects WebSocket
   */
  const disconnect = (): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const pingInterval = (
        wsRef.current as unknown as {
          _pingInterval?: ReturnType<typeof setInterval>;
        }
      )._pingInterval;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Connect on mount and when enabled changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: connect/disconnect functions are stable refs, getToken/queryClient/currentChatId/onStreamStarted are intentionally excluded to avoid unnecessary reconnections
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, wsUrl]);

  // Reconnect when token might have changed
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only reconnect when enabled changes, not on every token/queryClient change to avoid connection thrashing
  useEffect(() => {
    if (enabled && wsRef.current?.readyState === WebSocket.OPEN) {
      // Token might have refreshed, reconnect to use new token
      disconnect();
      connect();
    }
  }, [enabled]);
};
