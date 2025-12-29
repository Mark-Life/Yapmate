import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { Drawer } from "@/components/drawer/drawer";
import { HeaderControls } from "@/components/header-controls";
import { useSession } from "@/contexts/auth";
import { DrawerProvider } from "@/contexts/drawer-context";

/**
 * Layout for authenticated app routes
 * Redirects unauthenticated users to sign-in
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
    <DrawerProvider>
      <View className="flex-1">
        <HeaderControls />
        <Slot />
        <Drawer />
      </View>
    </DrawerProvider>
  );
}
