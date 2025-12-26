import "../globals.css";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/**
 * Root layout component for Expo Router
 * Provides SafeAreaProvider, PortalHost, StatusBar, and navigation structure
 */
export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaProvider
      className={`bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView className="flex-1">
        <Slot />
      </SafeAreaView>
      <PortalHost />
    </SafeAreaProvider>
  );
}
