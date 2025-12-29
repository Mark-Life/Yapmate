import { useChat } from "@ai-sdk/react";
import { PortalHost } from "@rn-primitives/portal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useAttachments } from "@/hooks/use-attachments";
import { useModels } from "@/hooks/use-models";
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
  isNew?: boolean;
  onChatCreated?: (id: string) => void;
};

/**
 * Main chat component for React Native
 * Handles message streaming, chat creation, and UI rendering
 */
export const Chat = ({
  id: initialId,
  initialMessages = [],
  isNew = false,
  onChatCreated,
}: ChatProps) => {
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const [input, setInput] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const { models } = useModels();
  const attachments = useAttachments();
  const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

  // Determine default model based on context
  const [model, setModel] = useState(() => {
    if (models.length > 0) {
      return determineDefaultModel({
        initialId,
        initialMessages,
        models,
        fallbackModel: FALLBACK_MODEL,
        queryClient,
      });
    }
    return FALLBACK_MODEL;
  });

  // Update model when models load or context changes
  useEffect(() => {
    if (models.length > 0) {
      const defaultModel = determineDefaultModel({
        initialId,
        initialMessages,
        models,
        fallbackModel: FALLBACK_MODEL,
        queryClient,
      });
      setModel(defaultModel);
    }
  }, [models, initialId, initialMessages, queryClient]);

  // For new chats, generate ID client-side; track if chat exists in DB
  const [chatId] = useState(() => initialId ?? Crypto.randomUUID());
  const [isNewChat, setIsNewChat] = useState(isNew || !initialId);

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
  const searchEnabledRef = useRef(searchEnabled);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    searchEnabledRef.current = searchEnabled;
  }, [searchEnabled]);

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
              searchEnabled: searchEnabledRef.current,
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
   * Creates chat in DB on first message
   * Uses placeholder title - real title comes via stream
   */
  const ensureChatExists = useCallback(async () => {
    if (!isNewChat) {
      return;
    }
    // Create with placeholder - real title comes via stream
    await createChatMutation.mutateAsync({ id: chatId, title: "New chat" });
    setIsNewChat(false);

    // Notify parent
    onChatCreated?.(chatId);
  }, [isNewChat, chatId, createChatMutation, onChatCreated]);

  const handleSubmit = async (message: {
    text: string;
    files: FileUIPart[];
  }) => {
    const hasText = Boolean(message.text.trim());
    const hasAttachments = message.files.length > 0;
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Create chat in DB on first message
    await ensureChatExists();

    // Send message via transport with files
    sendMessage({
      text: message.text.trim() || "Sent with attachments",
      files: message.files,
    });

    // Clear input and attachments after sending
    setInput("");
    attachments.clear();
  };

  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== "web") {
      Keyboard.dismiss();
    }
  }, []);

  // Track keyboard height for absolutely positioned input
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    // Use 'will' events on iOS for smoother animations, 'did' events on Android
    const showEventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEventName, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEventName, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View
      className={`relative flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      {messages.length === 0 ? (
        <Pressable className="flex-1" onPress={handleDismissKeyboard}>
          <View
            className="flex-1 items-center justify-center pb-32"
            style={{ paddingTop: insets.top }}
          >
            <Text className="font-bold text-4xl text-primary">Yapmate</Text>
          </View>
        </Pressable>
      ) : (
        <View className="flex-1">
          <MessagesHistory messages={messages} status={status} />
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? ["#0a0a0a", "rgba(10, 10, 10, 0.8)", "rgba(10, 10, 10, 0)"]
                : [
                    "#f5f5f5",
                    "rgba(245, 245, 245, 0.8)",
                    "rgba(245, 245, 245, 0)",
                  ]
            }
            locations={[0, 0.5, 1]}
            pointerEvents="none"
            style={styles.fadeOverlayTop}
          />
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? ["rgba(10, 10, 10, 0)", "rgba(10, 10, 10, 0.8)", "#0a0a0a"]
                : [
                    "rgba(245, 245, 245, 0)",
                    "rgba(245, 245, 245, 0.8)",
                    "#f5f5f5",
                  ]
            }
            locations={[0, 0.5, 1]}
            pointerEvents="none"
            style={styles.fadeOverlay}
          />
        </View>
      )}

      <View
        className="absolute right-0 left-0 z-10 p-1"
        style={{
          bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
        }}
      >
        <ChatInput
          attachments={attachments}
          input={input}
          model={model}
          onInputChange={setInput}
          onModelChange={setModel}
          onSearchEnabledChange={setSearchEnabled}
          onStop={handleStop}
          onSubmit={handleSubmit}
          portalHost="chat"
          searchEnabled={searchEnabled}
          status={status}
        />
      </View>
      <PortalHost name="chat" />
    </View>
  );
};

const styles = StyleSheet.create({
  fadeOverlayTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 100,
  },
  fadeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
});
