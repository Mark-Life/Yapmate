import { Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { UnifiedAuthForm } from "@/components/auth/UnifiedAuthForm";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";

/**
 * Sign-in screen component
 * Allows users to toggle between login and signup
 * Redirects authenticated users to the app
 */
export default function SignIn() {
  const { session, isLoading } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Redirect to app if already authenticated
  if (session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthContainer
      subtitle={
        mode === "login" ? "Sign in to your account" : "Create a new account"
      }
      title={mode === "login" ? "Welcome Back" : "Get Started"}
    >
      <UnifiedAuthForm type={mode} />
      <View className="mt-6 flex-row justify-center gap-2">
        <Text className="text-muted-foreground">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}
        </Text>
        <Button
          className="h-auto p-0"
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          variant="link"
        >
          <Text className="text-primary">
            {mode === "login" ? "Sign Up" : "Sign In"}
          </Text>
        </Button>
      </View>
    </AuthContainer>
  );
}
