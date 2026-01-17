import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import * as Crypto from "expo-crypto";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import { useAttachments } from "@/hooks/use-attachments";
import { useLocalChat } from "@/hooks/use-local-chat";
import { useModels } from "@/hooks/use-models";
import {
  getMemoryEnabled,
  getReasoningEffort,
  getSearchEnabled,
  getSelectedRuleIds,
  setMemoryEnabled as persistMemoryEnabled,
  setReasoningEffort as persistReasoningEffort,
  setSearchEnabled as persistSearchEnabled,
  setSelectedRuleIds as persistSelectedRuleIds,
  type ReasoningEffort,
  setLastUsedModel,
} from "@/hooks/use-user-preferences";
import { generateAPIUrl } from "@/lib/api-url";
import type { EventListener } from "@/lib/event-emitter";
import { eventTarget } from "@/lib/event-emitter";
import { lightTap } from "@/lib/haptics";
import { isLocalModel } from "@/lib/local-model";
import { rpcClient } from "@/lib/rpc-client";
import { supabase } from "@/lib/supabase";
import { YapmateIcon } from "../yapmate-icon";
import {
  createChat,
  determineDefaultModel,
  handleEdit,
  handleRegenerate,
  resumeStream,
} from "./chat-helpers";
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
  const [searchEnabled, setSearchEnabled] = useState(() => getSearchEnabled());
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(() =>
    getSelectedRuleIds()
  );
  const [memoryEnabled, setMemoryEnabled] = useState(() => getMemoryEnabled());
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(() =>
    getReasoningEffort()
  );
  const { models } = useModels();
  const attachments = useAttachments();
  const { capture } = useAnalytics();
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

  // Track message count for model switch warning (ref to avoid closure issues)
  const messagesCountRef = useRef(0);

  /**
   * Handles model change with AsyncStorage persistence
   * Shows warning when switching between local/server models mid-chat
   */
  const handleModelChange = useCallback(
    (newModel: string) => {
      const wasLocal = isLocalModel(model);
      const willBeLocal = isLocalModel(newModel);

      if (messagesCountRef.current > 0 && wasLocal !== willBeLocal) {
        Alert.alert(
          "Switch model type?",
          wasLocal
            ? "Switching to a cloud model will start a new server-synced chat. Your local messages won't be uploaded."
            : "Switching to on-device model will start a local-only chat. Messages won't sync to server.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Switch",
              onPress: () => {
                setModel(newModel);
                setLastUsedModel(newModel);
              },
            },
          ]
        );
        return;
      }

      setModel(newModel);
      setLastUsedModel(newModel);
    },
    [model]
  );

  /**
   * Handles search enabled change with AsyncStorage persistence
   */
  const handleSearchEnabledChange = useCallback((enabled: boolean) => {
    setSearchEnabled(enabled);
    persistSearchEnabled(enabled);
  }, []);

  const router = useRouter();

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
  const selectedRuleIdsRef = useRef(selectedRuleIds);
  const memoryEnabledRef = useRef(memoryEnabled);
  const reasoningEffortRef = useRef(reasoningEffort);
  const regenerateMessageIdRef = useRef<string | undefined>(undefined);
  const regenerateRoleRef = useRef<"user" | "assistant" | undefined>(undefined);
  const editMessageIdRef = useRef<string | undefined>(undefined);
  const editedTextRef = useRef<string | undefined>(undefined);
  const pendingRegenerationRef = useRef<{
    messageId: string;
    role: "user" | "assistant";
  } | null>(null);
  // Store model per assistant message for avatar display after streaming
  const messageModelMapRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  // Initialize model map from initial messages (DB-loaded messages have metadata.model)
  useEffect(() => {
    if (!initialMessages?.length) {
      return;
    }
    for (const msg of initialMessages) {
      const msgModel = (msg.metadata as { model?: string } | undefined)?.model;
      if (msg.role === "assistant" && msgModel) {
        messageModelMapRef.current.set(msg.id, msgModel);
      }
    }
  }, [initialMessages]);
  useEffect(() => {
    searchEnabledRef.current = searchEnabled;
  }, [searchEnabled]);
  useEffect(() => {
    selectedRuleIdsRef.current = selectedRuleIds;
  }, [selectedRuleIds]);
  useEffect(() => {
    memoryEnabledRef.current = memoryEnabled;
  }, [memoryEnabled]);
  useEffect(() => {
    reasoningEffortRef.current = reasoningEffort;
  }, [reasoningEffort]);

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
          const response = await expoFetch(urlString, {
            ...init,
            body: init?.body ?? undefined,
            signal: init?.signal ?? undefined,
            headers,
          });

          // Handle 402 Payment Required (rate limit exceeded)
          if (response.status === 402) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
              errorData.error || "Message limit exceeded"
            );
            (error as Error & { status: number; data: unknown }).status = 402;
            (error as Error & { status: number; data: unknown }).data =
              errorData;
            throw error;
          }

          return response;
        }) as unknown as typeof fetch,
        api: generateAPIUrl("/api/chat"),
        prepareSendMessagesRequest({
          messages: allMessages,
          id: transportChatId,
        }) {
          // Use refs to get latest values
          const regenerateMessageId = regenerateMessageIdRef.current;
          const regenerateRole = regenerateRoleRef.current;
          const editMessageId = editMessageIdRef.current;
          const editedText = editedTextRef.current;
          // Clear after use
          regenerateMessageIdRef.current = undefined;
          regenerateRoleRef.current = undefined;
          editMessageIdRef.current = undefined;
          editedTextRef.current = undefined;
          return {
            body: {
              message: allMessages.at(-1),
              id: transportChatId,
              model: modelRef.current,
              searchEnabled: searchEnabledRef.current,
              selectedRuleIds: selectedRuleIdsRef.current,
              memoryEnabled: memoryEnabledRef.current,
              reasoningEffort: reasoningEffortRef.current,
              ...(regenerateMessageId
                ? { regenerateMessageId, regenerateRole }
                : {}),
              ...(editMessageId && editedText
                ? { editMessageId, editedText }
                : {}),
            },
          };
        },
      })
  );

  const { messages, sendMessage, status, regenerate, setMessages } =
    useChat<ChatUIMessage>({
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
        // Handle model info for avatar display
        const part = dataPart as { type: string; data?: unknown };
        if (part.type === "data-model" && part.data) {
          const { model: streamedModel, assistantMessageId } = part.data as {
            model: string;
            assistantMessageId: string;
          };
          messageModelMapRef.current.set(assistantMessageId, streamedModel);
        }
      },
      onFinish: ({ messages: finishedMessages }) => {
        // Patch assistant messages with model from our stored map
        const patchedMessages = finishedMessages.map((msg) => {
          if (msg.role !== "assistant") {
            return msg;
          }
          const storedModel = messageModelMapRef.current.get(msg.id);
          if (!storedModel) {
            return msg;
          }
          return {
            ...msg,
            metadata: {
              ...(msg.metadata as { model?: string }),
              model: storedModel,
            },
          };
        });
        setMessages(patchedMessages as ChatUIMessage[]);
        // Invalidate cache so navigation back to this chat fetches fresh DB data
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      },
      onError: (error) => {
        // Handle 402 Payment Required (rate limit exceeded)
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 402
        ) {
          capture(AnalyticsEvents.MESSAGE_SEND_FAILED, {
            error: "rate_limit_exceeded",
          });
          Alert.alert(
            "Message limit reached",
            "You've reached your free monthly message limit. Your allowance will reset next month."
          );
          return;
        }
        capture(AnalyticsEvents.MESSAGE_SEND_FAILED, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error("useChat error:", error);
      },
    });

  // Local on-device chat hook (always called for React rules)
  const localChat = useLocalChat({
    id: chatId,
    initialMessages: [],
    onError: (error: Error) => {
      capture(AnalyticsEvents.MESSAGE_SEND_FAILED, {
        error: error.message,
      });
      console.error("Local chat error:", error);
    },
  });

  // Select active chat based on model type
  const usingLocalModel = isLocalModel(model);
  const activeMessages = usingLocalModel ? localChat.messages : messages;
  const activeStatus = usingLocalModel ? localChat.status : status;
  const activeSetMessages = usingLocalModel
    ? localChat.setMessages
    : setMessages;
  const activeRegenerate = usingLocalModel ? localChat.regenerate : regenerate;

  // Keep messagesCountRef in sync for model switch warning
  useEffect(() => {
    messagesCountRef.current = activeMessages.length;
  }, [activeMessages.length]);

  /**
   * Handles regeneration from a specific message
   */
  const handleRegenerateCallback = useCallback(
    (messageId: string, role: "user" | "assistant", selectedModel?: string) => {
      handleRegenerate({
        messageId,
        role,
        selectedModel,
        messages: activeMessages,
        setModel: handleModelChange,
        setMessages: activeSetMessages,
        regenerate: activeRegenerate,
        regenerateMessageIdRef,
        regenerateRoleRef,
      });
    },
    [activeMessages, activeRegenerate, activeSetMessages, handleModelChange]
  );

  /**
   * Handles editing a user message
   */
  const handleEditCallback = useCallback(
    (messageId: string, editedText: string) => {
      handleEdit({
        messageId,
        editedText,
        messages: activeMessages,
        setMessages: activeSetMessages,
        regenerate: activeRegenerate,
        editMessageIdRef,
        editedTextRef,
      });
    },
    [activeMessages, activeRegenerate, activeSetMessages]
  );

  /**
   * Handles request to open model selector for regeneration
   */
  const handleRequestModelForRegeneration = useCallback(
    (messageId: string, role: "user" | "assistant") => {
      // Store pending regeneration info
      pendingRegenerationRef.current = { messageId, role };
      // Navigate to model selector
      router.push({
        pathname: "/model-selector",
        params: { model: modelRef.current },
      });
    },
    [router]
  );

  /**
   * Listens for model-selected events from model-selector screen
   */
  useEffect(() => {
    const handleModelSelected: EventListener = (event) => {
      const detail = event.detail as { model: string };
      const selectedModel = detail.model;

      // Check if there's a pending regeneration
      const pending = pendingRegenerationRef.current;
      if (pending) {
        // Clear pending regeneration
        pendingRegenerationRef.current = null;
        // Trigger regeneration with selected model
        handleRegenerateCallback(
          pending.messageId,
          pending.role,
          selectedModel
        );
      } else {
        // Regular model change - persist to storage
        handleModelChange(selectedModel);
      }
    };

    eventTarget.addEventListener("model-selected", handleModelSelected);

    return () => {
      eventTarget.removeEventListener("model-selected", handleModelSelected);
    };
  }, [handleRegenerateCallback, handleModelChange]);

  /**
   * Listens for controls-updated events from chat-controls screen
   * Updates state and persists to storage
   */
  useEffect(() => {
    const handleControlsUpdated: EventListener = (event) => {
      const detail = event.detail as {
        selectedRuleIds: string[];
        memoryEnabled: boolean;
        reasoningEffort: ReasoningEffort;
      };
      setSelectedRuleIds(detail.selectedRuleIds);
      persistSelectedRuleIds(detail.selectedRuleIds);
      setMemoryEnabled(detail.memoryEnabled);
      persistMemoryEnabled(detail.memoryEnabled);
      setReasoningEffort(detail.reasoningEffort);
      persistReasoningEffort(detail.reasoningEffort);
    };

    eventTarget.addEventListener("controls-updated", handleControlsUpdated);

    return () => {
      eventTarget.removeEventListener(
        "controls-updated",
        handleControlsUpdated
      );
    };
  }, []);

  /**
   * Handles stopping the current stream
   */
  const handleStop = useCallback(async () => {
    capture(AnalyticsEvents.STREAM_STOPPED);

    // Local models: stop via hook
    if (usingLocalModel) {
      localChat.stop();
      return;
    }

    // Server models: stop via RPC
    if (!chatId) {
      return;
    }
    try {
      await rpcClient.chat.stop({ chatId });
    } catch (error) {
      console.error("Stop request failed:", error);
    }
  }, [chatId, capture, usingLocalModel, localChat]);

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

  /**
   * Listens for stream-started events from WebSocket sync
   * Resumes stream when another device starts streaming to this chat
   */
  useEffect(() => {
    if (!chatId || isNewChat) {
      return;
    }

    const handleStreamStarted: EventListener = (event) => {
      const detail = event.detail as { chatId: string };
      if (detail.chatId === chatId) {
        const isCancelled = { current: false };
        resumeStream(chatId, setMessages, queryClient, isCancelled);
      }
    };

    // Use cross-platform event target
    eventTarget.addEventListener("stream-started", handleStreamStarted);

    return () => {
      eventTarget.removeEventListener("stream-started", handleStreamStarted);
    };
  }, [chatId, isNewChat, setMessages, queryClient]);

  const handleSubmit = async (message: {
    text: string;
    files: FileUIPart[];
  }) => {
    const hasText = Boolean(message.text.trim());
    const hasAttachments = message.files.length > 0;
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Track message sent
    capture(AnalyticsEvents.MESSAGE_SENT, {
      model,
      has_attachments: hasAttachments,
      search_enabled: searchEnabled,
      is_local: usingLocalModel,
    });

    if (usingLocalModel) {
      // Local model: no server persistence, no file attachments
      localChat.sendMessage({ text: message.text.trim() });
    } else {
      // Server model: create chat in DB on first message
      await ensureChatExists();
      sendMessage({
        text: message.text.trim(),
        files: message.files,
      });
    }

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

  // Track scroll state and scroll-to-bottom function
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

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
      {activeMessages.length === 0 ? (
        <Pressable className="flex-1" onPress={handleDismissKeyboard}>
          <View
            className="flex-1 items-center justify-center pb-64"
            style={{ paddingTop: insets.top }}
          >
            <YapmateIcon className="text-primary opacity-80" size={160} />
          </View>
        </Pressable>
      ) : (
        <View className="flex-1">
          <MessagesHistory
            messages={activeMessages}
            onEdit={handleEditCallback}
            onRegenerate={handleRegenerateCallback}
            onRequestModelForRegeneration={handleRequestModelForRegeneration}
            onScrollStateChange={setIsAtBottom}
            scrollToBottomRef={scrollToBottomRef}
            status={activeStatus}
          />
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

      {!isAtBottom && activeMessages.length > 0 ? (
        <View
          className="absolute right-0 left-0 z-20 items-center"
          style={{
            bottom:
              (keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom) + 94,
          }}
        >
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Button
              className="size-8"
              onPress={() => {
                lightTap();
                scrollToBottomRef.current?.();
              }}
              variant="ghost"
            >
              <Icon as={ChevronDown} className="text-primary" size={20} />
            </Button>
          </GlassView>
        </View>
      ) : null}
      <View
        className="absolute right-0 left-0 z-10 p-1 pb-0"
        style={{
          bottom: keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom,
        }}
      >
        <ChatInput
          attachments={attachments}
          disableSearch={usingLocalModel}
          input={input}
          isNew={isNewChat}
          model={model}
          onInputChange={setInput}
          onModelChange={handleModelChange}
          onSearchEnabledChange={handleSearchEnabledChange}
          onStop={handleStop}
          onSubmit={handleSubmit}
          searchEnabled={searchEnabled && !usingLocalModel}
          status={activeStatus}
        />
      </View>
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
