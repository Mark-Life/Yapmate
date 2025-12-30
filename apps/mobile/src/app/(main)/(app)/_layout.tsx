import { useQueryClient } from "@tanstack/react-query";

import { Redirect, Stack } from "expo-router";

import { View } from "react-native";
import { AnimatedContent, Drawer } from "@/components/drawer/drawer";
import { HeaderControls } from "@/components/header-controls";
import { useSession } from "@/contexts/auth";
import { ChatProvider, useChatContext } from "@/contexts/chat-context";
import { DrawerProvider } from "@/contexts/drawer-context";
import { useWebSocketSync } from "@/hooks/use-websocket-sync";
import { generateWebSocketUrl } from "@/lib/api-url";
import { createCustomEvent, eventTarget } from "@/lib/event-emitter";
import { supabase } from "@/lib/supabase";

/**
 * Inner layout component that uses hooks (must be inside providers)
 */
const AppLayoutInner = () => {
  const queryClient = useQueryClient();
  const { currentChatId } = useChatContext();

  /**
   * Handles stream started event - dispatches custom event for Chat component
   */
  const handleStreamStarted = (chatId: string) => {
    // Dispatch custom event that Chat component can listen to
    eventTarget.dispatchEvent(createCustomEvent("stream-started", { chatId }));
  };

  // WebSocket real-time sync
  useWebSocketSync({
    wsUrl: generateWebSocketUrl(),
    getToken: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    },
    queryClient,
    currentChatId: currentChatId ?? undefined,
    onStreamStarted: handleStreamStarted,
  });

  return (
    <DrawerProvider>
      <View className="flex-1">
        {/* Drawer positioned behind content */}
        <Drawer />
        {/* AnimatedContent shifts right when drawer opens */}
        <AnimatedContent>
          <HeaderControls />
          <View className="flex-1">
            <Stack>
              <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="chats" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="model-selector"
                options={{
                  headerShown: false,
                  presentation: "formSheet",
                  sheetGrabberVisible: true,
                  sheetAllowedDetents: [0.45, 0.95],
                  contentStyle: {
                    backgroundColor: "transparent",
                  },
                }}
              />
            </Stack>
          </View>
        </AnimatedContent>
      </View>
    </DrawerProvider>
  );
};

/**
 * Layout for authenticated app routes
 * Redirects unauthenticated users to sign-in
 * Content scrolls behind safe areas, safe area padding applied per component
 */
export default function AppLayout() {
  const { session, isLoading } = useSession();

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Redirect to sign-in if not authenticated
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ChatProvider>
      <AppLayoutInner />
    </ChatProvider>
  );
}
