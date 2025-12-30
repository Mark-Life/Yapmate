import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { lightTap } from "@/lib/haptics";
import { rpcClient } from "@/lib/rpc-client";

/**
 * Rename chat screen presented as formSheet
 * Allows user to rename a chat
 */
export default function RenameChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { chatId, currentTitle } = useLocalSearchParams<{
    chatId: string;
    currentTitle?: string;
  }>();
  const [renameInput, setRenameInput] = useState(currentTitle ?? "");
  const inputRef = useRef<TextInput>(null);

  /**
   * Rename chat mutation
   */
  const renameChatMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!chatId) {
        return;
      }
      await rpcClient.chats.update({ id: chatId, title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.back();
    },
  });

  /**
   * Handle rename confirmation
   */
  const handleRenameConfirm = () => {
    if (renameInput.trim() && renameInput.trim() !== currentTitle) {
      lightTap();
      renameChatMutation.mutate(renameInput.trim());
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    lightTap();
    router.back();
  };

  /**
   * Focuses input when screen appears
   */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const canRename =
    renameInput.trim() &&
    renameInput.trim() !== currentTitle &&
    !renameChatMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <GlassContainer
          spacing={8}
          style={{ borderRadius: 24, padding: 16, gap: 16 }}
        >
          <View className="gap-2">
            <Text className="font-semibold text-foreground text-lg">
              Rename Chat
            </Text>
            <Text className="text-muted-foreground text-sm">
              Enter a new name for this chat.
            </Text>
          </View>

          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Input
              autoFocus
              className="rounded-full border-input bg-muted"
              onChangeText={setRenameInput}
              onSubmitEditing={handleRenameConfirm}
              placeholder="Chat name"
              ref={inputRef}
              value={renameInput}
            />
          </GlassView>

          <View className="flex-row gap-2">
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 32,
                padding: 0,
                overflow: "hidden",
                flex: 1,
              }}
            >
              <Button
                className="flex-1 rounded-full bg-muted"
                onPress={handleCancel}
                variant="outline"
              >
                <Text>Cancel</Text>
              </Button>
            </GlassView>
            <GlassView
              isInteractive={true}
              style={{
                borderRadius: 32,
                padding: 0,
                overflow: "hidden",
                flex: 1,
              }}
            >
              <Button
                className="flex-1 rounded-full"
                disabled={!canRename}
                onPress={handleRenameConfirm}
              >
                <Text>
                  {renameChatMutation.isPending ? "Renaming..." : "Rename"}
                </Text>
              </Button>
            </GlassView>
          </View>
        </GlassContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
