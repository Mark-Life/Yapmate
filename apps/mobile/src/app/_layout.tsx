import "../globals.css";
import "@/polyfills";
import { PortalHost } from "@rn-primitives/portal";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider, useSession } from "@/contexts/auth";
import { initUserPreferences } from "@/hooks/use-user-preferences";
import { useAuthLinking } from "@/hooks/useAuthLinking";
import { posthog } from "@/lib/posthog";
import { SplashScreenController } from "./splash";

/**
 * Root layout component for Expo Router
 * Provides SafeAreaProvider, PortalHost, StatusBar, and navigation structure
 */
export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <GestureHandlerRootView className="flex-1">
      <PostHogProvider
        autocapture={{
          captureTouches: true,
          captureScreens: false, // Manual tracking for expo-router
        }}
        client={posthog}
      >
        <SessionProvider>
          <QueryProvider>
            <SplashScreenController />
            <AuthLinkingHandler />
            <UserPreferencesInitializer />
            <PostHogIdentify />
            <PostHogScreenTracker />
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
      </PostHogProvider>
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
        <Stack.Screen name="auth/callback" />
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

/**
 * Initializes user preferences from AsyncStorage on app start
 */
function UserPreferencesInitializer() {
  useEffect(() => {
    initUserPreferences();
  }, []);
  return null;
}

/**
 * Identifies users in PostHog when they sign in
 * Resets PostHog on sign out to clear user data
 */
function PostHogIdentify() {
  const { session } = useSession();
  const ph = usePostHog();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id ?? null;

    // User signed in
    if (userId && userId !== prevUserId.current) {
      const email = session?.user?.email;
      ph.identify(userId, email ? { email } : undefined);
    }

    // User signed out
    if (!userId && prevUserId.current) {
      ph.reset();
    }

    prevUserId.current = userId;
  }, [session, ph]);

  return null;
}

/**
 * Tracks screen views for expo-router
 * Required for @react-navigation/native v7+
 */
function PostHogScreenTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname) {
      ph.screen(pathname, { segments });
    }
  }, [pathname, segments, ph]);

  return null;
}
