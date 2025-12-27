import "../globals.css";
import "@/polyfills";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
    <SessionProvider>
      <QueryProvider>
        <SplashScreenController />
        <AuthLinkingHandler />
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
 * Component to handle authentication deep links
 * Must be inside SessionProvider to access auth context
 */
function AuthLinkingHandler() {
  useAuthLinking();
  return null;
}

/**
 * Root navigator using Protected Routes
 * Protects (app) route group - only accessible when authenticated
 * Sign-in route remains accessible to unauthenticated users
 */
function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
