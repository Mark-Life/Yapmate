import { GlassView } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { LogIn } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";

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
        className="absolute top-0 right-0 left-0 z-10 flex-row items-center justify-start px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <GlassView
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <Pressable
            className="flex h-9 flex-row items-center gap-2 rounded-full px-3 py-2"
            onPress={() => router.replace("/sign-in")}
          >
            <Icon as={LogIn} className="text-primary" size={16} />
            <Text className="text-primary text-sm">Sign in</Text>
          </Pressable>
        </GlassView>
      </View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="model-selector"
          options={{
            headerShown: false,
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.45, 0.75],
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />
      </Stack>
    </View>
  );
}
