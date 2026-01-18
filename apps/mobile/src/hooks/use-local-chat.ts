import { apple } from "@react-native-ai/apple";
import type { LanguageModel, UIMessage } from "ai";
import { streamText } from "ai";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";

type LocalChatStatus = "ready" | "submitted" | "streaming" | "error";

type UseLocalChatOptions = {
  id: string;
  initialMessages?: UIMessage[];
  onFinish?: (result: { messages: UIMessage[] }) => void;
  onError?: (error: Error) => void;
};

/**
 * Extracts text content from UIMessage parts
 */
const getMessageText = (message: UIMessage) => {
  const textPart = message.parts.find((p) => p.type === "text");
  return textPart?.type === "text" ? textPart.text : "";
};

/**
 * Hook for local on-device AI chat using Apple Foundation Models
 * Mirrors the useChat API for compatibility with Chat component
 */
export const useLocalChat = ({
  initialMessages = [],
  onFinish,
  onError,
}: UseLocalChatOptions) => {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [status, setStatus] = useState<LocalChatStatus>("ready");
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("ready");
  }, []);

  // Abort stream on unmount to prevent state updates on unmounted component
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const sendMessage = useCallback(
    async (input: { text: string }) => {
      if (!input.text.trim()) {
        return;
      }

      const userMessage: UIMessage = {
        id: Crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: input.text.trim() }],
      };

      const assistantMessageId = Crypto.randomUUID();
      const assistantMessage: UIMessage = {
        id: assistantMessageId,
        role: "assistant",
        parts: [{ type: "text", text: "" }],
      };

      const newMessages = [...messages, userMessage, assistantMessage];
      setMessages(newMessages);
      setStatus("submitted");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        setStatus("streaming");

        const result = streamText({
          model: apple() as LanguageModel,
          messages: newMessages
            .filter((m) => m.role !== "assistant" || getMessageText(m))
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: getMessageText(m),
            })),
          abortSignal: abortController.signal,
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          if (abortController.signal.aborted) {
            break;
          }
          fullText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, parts: [{ type: "text", text: fullText }] }
                : m
            )
          );
        }

        const finalMessages = newMessages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, parts: [{ type: "text" as const, text: fullText }] }
            : m
        );

        setMessages(finalMessages);
        setStatus("ready");
        onFinish?.({ messages: finalMessages });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setStatus("ready");
          return;
        }
        setStatus("error");
        onError?.(error as Error);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [messages, onFinish, onError]
  );

  const regenerate = useCallback(async () => {
    if (messages.length < 2) {
      return;
    }

    const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
    if (lastUserIdx === -1) {
      return;
    }

    const messagesUpToUser = messages.slice(0, lastUserIdx + 1);

    setMessages(messagesUpToUser);

    const assistantMessageId = Crypto.randomUUID();
    const assistantMessage: UIMessage = {
      id: assistantMessageId,
      role: "assistant",
      parts: [{ type: "text", text: "" }],
    };

    const newMessages = [...messagesUpToUser, assistantMessage];
    setMessages(newMessages);
    setStatus("submitted");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setStatus("streaming");

      const result = streamText({
        model: apple() as LanguageModel,
        messages: messagesUpToUser.map((m) => ({
          role: m.role as "user" | "assistant",
          content: getMessageText(m),
        })),
        abortSignal: abortController.signal,
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        if (abortController.signal.aborted) {
          break;
        }
        fullText += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, parts: [{ type: "text", text: fullText }] }
              : m
          )
        );
      }

      const finalMessages = newMessages.map((m) =>
        m.id === assistantMessageId
          ? { ...m, parts: [{ type: "text" as const, text: fullText }] }
          : m
      );

      setMessages(finalMessages);
      setStatus("ready");
      onFinish?.({ messages: finalMessages });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("ready");
        return;
      }
      setStatus("error");
      onError?.(error as Error);
    } finally {
      abortControllerRef.current = null;
    }
  }, [messages, onFinish, onError]);

  return {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    regenerate,
  };
};
