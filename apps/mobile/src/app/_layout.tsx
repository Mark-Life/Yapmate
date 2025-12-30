import "../globals.css";
import "@/polyfills";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider, useSession } from "@/contexts/auth";
import { useAuthLinking } from "@/hooks/useAuthLinking";
import { SplashScreenController } from "./splash";

/**
 * Root layout component for Expo Router
 * Provides SafeAreaProvider, PortalHost, StatusBar, and navigation structure
 */
export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <GestureHandlerRootView className="flex-1">
      <SessionProvider>
        <QueryProvider>
          <SplashScreenController />
          <AuthLinkingHandler />
          <SafeAreaProvider>
            <View
              className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
            >
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
              <RootNavigator />
              <PortalHost />
            </View>
          </SafeAreaProvider>
        </QueryProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Root navigator using Stack with protected routes
 * Uses Stack.Protected to guard routes based on auth state
 */
function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Handles authentication deep links
 * Must be inside SessionProvider to access auth context
 */
function AuthLinkingHandler() {
  useAuthLinking();
  return null;
}
