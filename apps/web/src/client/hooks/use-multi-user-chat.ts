/**
 * Multi-user chat hook
 * Manages members, presence, typing indicators for shared chats
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { rpcClient } from "../lib/rpc-client";

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

    const handleWsEvent = (
      event: CustomEvent<{
        type: string;
        userId?: string;
        displayName?: string;
        chatId?: string;
      }>
    ) => {
      const data = event.detail;

      if (data.chatId !== chatId) {
        return;
      }

      switch (data.type) {
        case "member_joined":
        case "member_left":
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
    window.addEventListener(
      "multi-user-event" as keyof WindowEventMap,
      handleWsEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "multi-user-event" as keyof WindowEventMap,
        handleWsEvent as EventListener
      );

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

/**
 * Hook for invite management
 */
export const useInvites = (chatId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch active invites
  const { data: invitesData, isLoading } = useQuery({
    queryKey: ["chat-invites", chatId],
    queryFn: () => {
      if (!chatId) {
        return Promise.resolve({
          invites: [] as {
            code: string;
            createdAt: number;
            expiresAt: number;
          }[],
        });
      }
      return rpcClient.invite.list({ chatId });
    },
    enabled: Boolean(chatId),
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: () => {
      if (!chatId) {
        return Promise.reject(new Error("No chat ID"));
      }
      return rpcClient.invite.create({ chatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-invites", chatId] });
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: (code: string) => {
      if (!chatId) {
        return Promise.reject(new Error("No chat ID"));
      }
      return rpcClient.invite.revoke({ chatId, code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-invites", chatId] });
    },
  });

  return {
    invites: invitesData?.invites ?? [],
    isLoading,
    createInvite: createInviteMutation.mutateAsync,
    isCreating: createInviteMutation.isPending,
    revokeInvite: revokeInviteMutation.mutateAsync,
    isRevoking: revokeInviteMutation.isPending,
  };
};

/**
 * Hook for joining a chat via invite
 */
export const useJoinChat = () => {
  const queryClient = useQueryClient();

  // Validate invite
  const validateMutation = useMutation({
    mutationFn: (code: string) => rpcClient.invite.validate({ code }),
  });

  // Join chat
  const joinMutation = useMutation({
    mutationFn: ({
      chatId,
      inviteCode,
      displayName,
    }: {
      chatId: string;
      inviteCode: string;
      displayName?: string;
    }) => rpcClient.members.join({ chatId, inviteCode, displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  return {
    validateInvite: validateMutation.mutateAsync,
    isValidating: validateMutation.isPending,
    validationData: validateMutation.data,
    validationError: validateMutation.error,
    joinChat: joinMutation.mutateAsync,
    isJoining: joinMutation.isPending,
    joinError: joinMutation.error,
  };
};
