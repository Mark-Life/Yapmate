import { Stack, useRouter } from "expo-router";
import { LogIn } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/**
 * Layout for guest (unauthenticated) routes
 * Minimal providers, simple Stack with "Sign in" button in header
 */
export default function GuestLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <View
        className="absolute top-0 right-0 left-0 z-10 flex-row items-center justify-end px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Button
          className="flex-row items-center gap-2"
          onPress={() => router.replace("/sign-in")}
          variant="outline"
        >
          <Icon as={LogIn} className="text-primary" size={16} />
          <Text className="text-primary text-sm">Sign in</Text>
        </Button>
      </View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="chat" />
      </Stack>
    </View>
  );
}
