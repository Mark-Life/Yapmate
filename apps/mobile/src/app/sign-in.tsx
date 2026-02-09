import { GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WebViewNavigation } from "react-native-webview";
import { WebView } from "react-native-webview";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { generateAPIUrl } from "@/lib/api-url";
import { createSessionFromUrl } from "@/lib/auth-linking";

const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || "yapmate";

/**
 * Sign-in screen component
 * Opens web login in an in-app WebView for Turnstile CAPTCHA support
 */
export default function SignIn() {
  const router = useRouter();
  const [showWebView, setShowWebView] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const authUrl = `${generateAPIUrl("/login")}?mobile=true&scheme=${APP_SCHEME}`;

  /** Intercept navigation to the deep link callback and extract tokens */
  const handleNavigationStateChange = (event: WebViewNavigation) => {
    const { url } = event;

    if (!url.startsWith(`${APP_SCHEME}://auth/callback`)) {
      return;
    }

    setIsProcessing(true);
    setShowWebView(false);

    createSessionFromUrl(url).then(({ session, error }) => {
      setIsProcessing(false);
      if (session) {
        router.replace("/");
      } else {
        console.error("WebView auth failed:", error?.message);
      }
    });

    return false;
  };

  /** Block navigation to deep link scheme so WebView doesn't try to load it */
  const handleShouldStartLoad = (event: WebViewNavigation) => {
    if (event.url.startsWith(`${APP_SCHEME}://`)) {
      handleNavigationStateChange(event);
      return false;
    }
    return true;
  };

  return (
    <>
      <AuthContainer subtitle="Sign in or create an account" title="Welcome">
        <Button
          className="w-full"
          disabled={isProcessing}
          onPress={() => setShowWebView(true)}
          size="lg"
        >
          <Text>{isProcessing ? "Signing in..." : "Sign In"}</Text>
        </Button>
        <View className="mt-24 items-center">
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Button
              className="h-auto rounded-full"
              onPress={() => router.replace("/(guest)")}
              variant="ghost"
            >
              <Text className="text-primary">Continue as guest</Text>
            </Button>
          </GlassView>
        </View>
      </AuthContainer>

      <Modal
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
        presentationStyle="pageSheet"
        visible={showWebView}
      >
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-2">
            <Button
              onPress={() => setShowWebView(false)}
              size="sm"
              variant="ghost"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
          <WebView
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            ref={webViewRef}
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
              </View>
            )}
            source={{ uri: authUrl }}
            startInLoadingState={true}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
