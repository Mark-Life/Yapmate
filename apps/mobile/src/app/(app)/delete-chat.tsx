import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useChatContext } from "@/contexts/chat-context";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import { lightTap } from "@/lib/haptics";
import { rpcClient } from "@/lib/rpc-client";

/**
 * Delete chat confirmation screen presented as formSheet
 * Allows user to confirm chat deletion
 */
export default function DeleteChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentChatId, navigateToNew } = useChatContext();
  const { chatId } = useLocalSearchParams<{
    chatId: string;
  }>();
  const { capture } = useAnalytics();

  /**
   * Delete chat mutation
   */
  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      if (!chatId) {
        return;
      }
      await rpcClient.chats.delete({ id: chatId });
    },
    onSuccess: () => {
      capture(AnalyticsEvents.CHAT_DELETED);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (chatId === currentChatId) {
        navigateToNew();
      }
      router.back();
    },
  });

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = () => {
    if (chatId) {
      lightTap();
      deleteChatMutation.mutate();
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    lightTap();
    router.back();
  };

  return (
    <View className="flex-1" style={{ paddingTop: 16 }}>
      <View className="flex-1 p-4">
        <GlassContainer
          spacing={8}
          style={{ borderRadius: 24, padding: 16, gap: 16 }}
        >
          <View className="gap-2">
            <Text className="font-semibold text-foreground text-lg">
              Delete chat?
            </Text>
            <Text className="text-muted-foreground text-sm">
              This action cannot be undone. This will permanently delete the
              chat and all its messages.
            </Text>
          </View>

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
              tintColor="#ef4444"
            >
              <Button
                className="flex-1 rounded-full"
                disabled={deleteChatMutation.isPending}
                onPress={handleDeleteConfirm}
                variant="destructive"
              >
                <Text>
                  {deleteChatMutation.isPending ? "Deleting..." : "Delete"}
                </Text>
              </Button>
            </GlassView>
          </View>
        </GlassContainer>
      </View>
    </View>
  );
}
