import * as WebBrowser from "expo-web-browser";
import { GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { generateAPIUrl } from "@/lib/api-url";

const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME || "yapmate";

/**
 * Sign-in screen component
 * Opens web login in browser for Turnstile CAPTCHA support
 * Route protection handled by Stack.Protected in root layout
 */
export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      const authUrl = `${generateAPIUrl("/login")}?mobile=true&scheme=${APP_SCHEME}`;
      await WebBrowser.openBrowserAsync(authUrl);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContainer subtitle="Sign in or create an account" title="Welcome">
      <Button
        className="w-full"
        disabled={isLoading}
        onPress={handleAuth}
        size="lg"
      >
        <Text>{isLoading ? "Opening..." : "Continue with Browser"}</Text>
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
  );
}
