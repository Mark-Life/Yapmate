import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { AnimatedContent, Drawer } from "@/components/drawer/drawer";
import { HeaderControls } from "@/components/header-controls";
import { ChatProvider, useChatContext } from "@/contexts/chat-context";
import { DrawerProvider, useDrawer } from "@/contexts/drawer-context";
import { UserProvider } from "@/contexts/user-context";
import { useWebSocketSync } from "@/hooks/use-websocket-sync";
import { generateWebSocketUrl } from "@/lib/api-url";
import { getModalBackground } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

/**
 * Stack screens configuration - shared between layouts
 */
const StackScreens = () => {
  const { colorScheme } = useColorScheme();
  const modalBg = getModalBackground(colorScheme);

  return (
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
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="rename-chat"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.26],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="delete-chat"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.25],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.45],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="chat-controls"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.98],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="mcp-tools"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.98],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.55],
          contentStyle: { backgroundColor: modalBg },
        }}
      />
    </Stack>
  );
};

/**
 * Layout content - renders differently based on isPermanent mode
 */
const LayoutContent = () => {
  const { isPermanent } = useDrawer();

  // iPad landscape: side-by-side layout with permanent sidebar
  if (isPermanent) {
    return (
      <View className="flex-1 flex-row">
        <Drawer />
        <View className="flex-1">
          <HeaderControls />
          <View className="flex-1">
            <StackScreens />
          </View>
        </View>
      </View>
    );
  }

  // Phone/iPad portrait: overlay drawer layout
  return (
    <View className="flex-1">
      <Drawer />
      <AnimatedContent>
        <HeaderControls />
        <View className="flex-1">
          <StackScreens />
        </View>
      </AnimatedContent>
    </View>
  );
};

/**
 * Inner layout component that uses hooks (must be inside providers)
 */
const AppLayoutInner = () => {
  const queryClient = useQueryClient();
  const { currentChatId } = useChatContext();

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
  });

  return (
    <DrawerProvider>
      <LayoutContent />
    </DrawerProvider>
  );
};

/**
 * Layout for authenticated app routes
 * Route protection handled by Stack.Protected in root layout
 */
export default function AppLayout() {
  return (
    <ChatProvider>
      <UserProvider>
        <AppLayoutInner />
      </UserProvider>
    </ChatProvider>
  );
}
