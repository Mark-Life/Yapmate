import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GuestChatInput } from "@/components/chat/guest-chat-input";
import { MessagesHistory } from "@/components/chat/messages-history";
import { YapmateIcon } from "@/components/yapmate-icon";
import { useLocalChat } from "@/hooks/use-local-chat";

/**
 * Guest chat screen using Apple Foundation Model only
 * No server calls, in-memory only (not persisted)
 */
export default function GuestChatScreen() {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [input, setInput] = useState("");

  const localChat = useLocalChat({
    id: "guest",
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const showEventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEventName, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEventName, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSubmit = (text: string) => {
    if (!text.trim()) {
      return;
    }
    localChat.sendMessage({ text: text.trim() });
    setInput("");
  };

  const handleDismissKeyboard = useCallback(() => {
    if (Platform.OS !== "web") {
      Keyboard.dismiss();
    }
  }, []);

  const handleClear = useCallback(() => {
    localChat.setMessages([]);
  }, [localChat]);

  return (
    <View
      className={`relative flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      {localChat.messages.length === 0 ? (
        <Pressable className="flex-1" onPress={handleDismissKeyboard}>
          <View
            className="flex-1 items-center justify-center pb-64"
            style={{ paddingTop: insets.top }}
          >
            <YapmateIcon className="text-primary opacity-80" size={160} />
          </View>
        </Pressable>
      ) : (
        <View className="mt-4 flex-1">
          <MessagesHistory
            messages={localChat.messages}
            status={localChat.status}
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
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 100,
            }}
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
        className="absolute right-0 left-0 z-10 p-1 pb-0"
        style={{
          bottom: keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom,
        }}
      >
        <GuestChatInput
          hasMessages={localChat.messages.length > 0}
          input={input}
          onClear={handleClear}
          onInputChange={setInput}
          onStop={localChat.stop}
          onSubmit={handleSubmit}
          status={localChat.status}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fadeOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
});
