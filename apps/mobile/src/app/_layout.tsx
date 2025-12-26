import "../globals.css";
import { PortalHost } from "@rn-primitives/portal";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider } from "@/contexts/auth";
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
        <SafeAreaProvider
          className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
        >
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <SafeAreaView
            className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
          >
            <RootNavigator />
          </SafeAreaView>
          <PortalHost />
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
 * Root navigator using Slot
 * Authentication is handled in (app)/_layout.tsx via redirect
 */
function RootNavigator() {
  return <Slot />;
}
