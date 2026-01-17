import type { UIMessage } from "ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "guest_chat_messages";

/**
 * Hook for persisting guest chat messages to AsyncStorage
 * Loads on mount and saves on change
 */
export const useGuestChatStorage = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setMessages(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load guest chat messages:", error);
      } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    const save = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save guest chat messages:", error);
      }
    };
    save();
  }, [messages]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear guest chat messages:", error);
    }
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    clearMessages,
  };
};
