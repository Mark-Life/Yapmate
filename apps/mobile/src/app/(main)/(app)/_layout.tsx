import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Drawer } from "@/components/drawer/drawer";
import { HeaderControls } from "@/components/header-controls";
import { useSession } from "@/contexts/auth";
import { ChatProvider } from "@/contexts/chat-context";
import { DrawerProvider } from "@/contexts/drawer-context";

/**
 * Layout for authenticated app routes
 * Redirects unauthenticated users to sign-in
 * Main content respects safe area, drawer is full-screen
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
      <DrawerProvider>
        <View className="flex-1">
          {/* HeaderControls positioned absolutely, needs full screen reference */}
          <HeaderControls />
          {/* Main content respects safe area */}
          <SafeAreaView className="flex-1">
            <Slot />
          </SafeAreaView>
          {/* Drawer is full-screen, outside SafeAreaView */}
          <Drawer />
        </View>
      </DrawerProvider>
    </ChatProvider>
  );
}
