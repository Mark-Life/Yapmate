import "../globals.css";
import "@/polyfills";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider } from "@/contexts/auth";
import { SplashScreenController } from "./splash";

/**
 * Root layout component for Expo Router
 * Provides SafeAreaProvider, PortalHost, StatusBar, and navigation structure
 */
export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <SessionProvider>
      <QueryProvider>
        <SplashScreenController />
        <SafeAreaProvider>
          <View
            className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
          >
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <SafeAreaView className="flex-1">
              <RootNavigator />
            </SafeAreaView>
            <PortalHost />
          </View>
        </SafeAreaProvider>
      </QueryProvider>
    </SessionProvider>
  );
}

/**
 * Root navigator using Slot primitive
 * Slot renders child routes automatically based on file structure
 * Route protection is handled at the layout level using Redirect components
 */
function RootNavigator() {
  return <Slot />;
}
