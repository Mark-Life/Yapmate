import type * as React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";

interface AuthContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Container component for authentication screens
 * Handles keyboard avoidance and safe area insets
 */
export function AuthContainer({
  title,
  subtitle,
  children,
}: AuthContainerProps) {
  const handlePress = () => {
    // Only dismiss keyboard on mobile platforms, not web
    if (Platform.OS !== "web") {
      Keyboard.dismiss();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={handlePress}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 items-center justify-center px-4">
              <View className="w-full max-w-md">
                <View className="mb-8 items-center">
                  <Text className="text-center font-bold text-3xl text-foreground">
                    {title}
                  </Text>
                  <Text className="mt-2 text-center text-muted-foreground">
                    {subtitle}
                  </Text>
                </View>
                {children}
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AuthContainer;
