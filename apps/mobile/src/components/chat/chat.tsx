import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { generateAPIUrl } from "@/lib/api-url";
import { rpcClient } from "@/lib/rpc-client";
import { supabase } from "@/lib/supabase";
import { createChat, determineDefaultModel } from "./chat-helpers";
import { ChatInput } from "./chat-input";
import { MessagesHistory } from "./messages-history";

type ChatUIMessage = UIMessage;

type ChatProps = {
  id?: string;
  initialMessages?: ChatUIMessage[];
  onChatCreated?: (id: string) => void;
};

/**
 * Main chat component for React Native
 * Handles message streaming, chat creation, and UI rendering
 */
export const Chat = ({
  id: initialId,
  initialMessages = [],
  onChatCreated,
}: ChatProps) => {
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const [input, setInput] = useState("");
  const [model] = useState(() => determineDefaultModel());
  // const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

  // For new chats, generate ID client-side; track if chat exists in DB
  const [chatId] = useState(() => initialId ?? Crypto.randomUUID());
  const [isNewChat, setIsNewChat] = useState(!initialId);

  // Mutation to create chat
  const createChatMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      createChat(id, title),
    onSuccess: () => {
      // Invalidate chats query to update list
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Use refs to always have latest values for transport closure
  const modelRef = useRef(model);
  modelRef.current = model;

  // Create transport once with refs to avoid stale closures
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        fetch: (async (url: string | URL | Request, init?: RequestInit) => {
          // Get current session token
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;

          // Add Authorization header if token exists
          const headers = new Headers(init?.headers);
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          headers.set("Content-Type", "application/json");

          // Convert URL/Request to string for expo/fetch compatibility
          const urlString = url instanceof Request ? url.url : url.toString();

          // Use expo/fetch for streaming support
          return expoFetch(urlString, {
            ...init,
            body: init?.body ?? undefined,
            signal: init?.signal ?? undefined,
            headers,
          });
        }) as unknown as typeof fetch,
        api: generateAPIUrl("/api/chat"),
        prepareSendMessagesRequest({
          messages: allMessages,
          id: transportChatId,
        }) {
          return {
            body: {
              message: allMessages.at(-1),
              id: transportChatId,
              model: modelRef.current,
            },
          };
        },
      })
  );

  const { messages, sendMessage, status, setMessages } = useChat<ChatUIMessage>(
    {
      id: chatId,
      messages: initialMessages,
      transport,
      generateId: () => Crypto.randomUUID(),
      onData: (dataPart) => {
        // Handle streamed title updates
        if (dataPart.type === "data-chat-title") {
          // Refresh chats list to show new title
          queryClient.invalidateQueries({ queryKey: ["chats"] });
        }
      },
      onFinish: ({ messages: finishedMessages }) => {
        // Manually update messages state to ensure UI reflects completed stream
        setMessages(finishedMessages);
        // Invalidate cache so navigation back to this chat fetches fresh DB data
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      },
      onError: (error) => {
        console.error("useChat error:", error);
      },
    }
  );

  /**
   * Handles stopping the current stream
   */
  const handleStop = useCallback(async () => {
    if (!chatId) {
      return;
    }

    try {
      await rpcClient.chat.stop({ chatId });
    } catch (error) {
      console.error("Stop request failed:", error);
    }
  }, [chatId]);

  /**
   * Creates chat in DB on first message, updates navigation
   * Uses placeholder title - real title comes via stream
   */
  const ensureChatExists = useCallback(async () => {
    if (!isNewChat) {
      return;
    }
    // Create with placeholder - real title comes via stream
    await createChatMutation.mutateAsync({ id: chatId, title: "New chat" });
    setIsNewChat(false);

    // Navigate to chat route
    router.replace(`/chat/${chatId}`);

    // Notify parent
    onChatCreated?.(chatId);
  }, [isNewChat, chatId, createChatMutation, onChatCreated]);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) {
      return;
    }

    // Create chat in DB on first message
    await ensureChatExists();

    // Send message via transport
    sendMessage({
      text: text.trim(),
    });

    setInput("");
  };

  return (
    <View
      className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="opacity-60">
            <View className="items-center justify-center">
              <View className="h-24 w-24 rounded-full bg-primary" />
            </View>
          </View>
        </View>
      ) : (
        <MessagesHistory messages={messages} status={status} />
      )}

      <View className="border-border border-t p-2">
        <ChatInput
          input={input}
          onInputChange={setInput}
          onStop={handleStop}
          onSubmit={handleSubmit}
          status={status}
        />
      </View>
    </View>
  );
};
