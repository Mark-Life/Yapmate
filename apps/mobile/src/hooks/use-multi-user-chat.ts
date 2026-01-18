/**
 * Multi-user chat hook
 * Manages members, presence, typing indicators for shared chats
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { EventListener } from "@/lib/event-emitter";
import { eventTarget } from "@/lib/event-emitter";
import { rpcClient } from "@/lib/rpc-client";

export type ChatMember = {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  isOnline: boolean;
};

type UseMultiUserChatOptions = {
  chatId: string | null;
  enabled?: boolean;
};

type UseMultiUserChatReturn = {
  members: ChatMember[];
  isLoading: boolean;
  isMultiUser: boolean;
  typingMembers: Map<string, string>;
  refetchMembers: () => void;
};

/**
 * Hook for multi-user chat functionality
 * Handles member list, presence, and typing indicators
 */
export const useMultiUserChat = ({
  chatId,
  enabled = true,
}: UseMultiUserChatOptions): UseMultiUserChatReturn => {
  const queryClient = useQueryClient();
  const [typingMembers, setTypingMembers] = useState<Map<string, string>>(
    new Map()
  );
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Fetch members
  const {
    data: membersData,
    isLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["chat-members", chatId],
    queryFn: () => {
      if (!chatId) {
        return Promise.resolve({ members: [] as ChatMember[] });
      }
      return rpcClient.members.list({ chatId });
    },
    enabled: enabled && Boolean(chatId),
    staleTime: 30_000, // 30 seconds
  });

  const members = membersData?.members ?? [];
  const isMultiUser = members.length > 1;

  // Handle typing start event
  const handleTypingStart = (userId: string, displayName: string) => {
    setTypingMembers((prev) => {
      const next = new Map(prev);
      next.set(userId, displayName);
      return next;
    });

    // Clear after 3 seconds if no stop event
    const existingTimeout = typingTimeoutsRef.current.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeout = setTimeout(() => {
      setTypingMembers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }, 3000);
    typingTimeoutsRef.current.set(userId, timeout);
  };

  // Handle typing stop event
  const handleTypingStop = (userId: string) => {
    setTypingMembers((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    const timeout = typingTimeoutsRef.current.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutsRef.current.delete(userId);
    }
  };

  // Listen for WebSocket events
  useEffect(() => {
    if (!(chatId && enabled)) {
      return;
    }

    const handleWsEvent: EventListener = (event) => {
      const data = event.detail as {
        type: string;
        userId?: string;
        displayName?: string;
        chatId?: string;
      };

      if (data.chatId !== chatId) {
        return;
      }

      switch (data.type) {
        case "member_joined":
        case "member_left":
        case "member_updated":
        case "presence_update":
          queryClient.invalidateQueries({ queryKey: ["chat-members", chatId] });
          break;

        case "member_typing":
          if (data.userId && data.displayName) {
            handleTypingStart(data.userId, data.displayName);
          }
          break;

        case "member_stopped_typing":
          if (data.userId) {
            handleTypingStop(data.userId);
          }
          break;

        default:
          break;
      }
    };

    // Listen for custom events dispatched from WebSocket sync
    eventTarget.addEventListener("multi-user-event", handleWsEvent);

    return () => {
      eventTarget.removeEventListener("multi-user-event", handleWsEvent);

      // Clear all typing timeouts
      for (const timeout of typingTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
    };
  }, [chatId, enabled, queryClient]);

  return {
    members,
    isLoading,
    isMultiUser,
    typingMembers,
    refetchMembers,
  };
};
