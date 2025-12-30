import { useState } from "react";
import { View } from "react-native";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { UnifiedAuthForm } from "@/components/auth/UnifiedAuthForm";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * Sign-in screen component
 * Allows users to toggle between login and signup
 * Route protection handled by Stack.Protected in root layout
 */
export default function SignIn() {
  const [mode, setMode] = useState<"login" | "signup">("login");

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
