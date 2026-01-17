import { TOP_MODELS } from "@yapmate/core/models/config";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Check, Lock, Smartphone, Sparkles } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { lightTap } from "@/lib/haptics";

const NUMBER_REGEX = /^\d/;

/**
 * Extracts display name from model ID
 * e.g., "anthropic/claude-sonnet-4.5" -> "Claude Sonnet 4.5"
 */
const getModelDisplayName = (modelId: string): string => {
  // Remove provider prefix
  const name = modelId.includes("/") ? modelId.split("/")[1] : modelId;

  // Convert kebab-case to Title Case and clean up
  return name
    .split("-")
    .map((word) => {
      // Keep version numbers as-is
      if (NUMBER_REGEX.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

/**
 * Extracts provider name from model ID
 * e.g., "anthropic/claude-sonnet-4.5" -> "Anthropic"
 */
const getProviderName = (modelId: string): string => {
  if (!modelId.includes("/")) {
    return "Other";
  }
  const provider = modelId.split("/")[0];
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

/**
 * Guest model selector screen
 * Shows Apple Intelligence as available, other models as locked
 */
export default function GuestModelSelectorScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const handleSelectApple = () => {
    lightTap();
    router.back();
  };

  const handleSignIn = () => {
    lightTap();
    router.replace("/sign-in");
  };

  return (
    <View className="flex-1" style={{ paddingTop: 16 }}>
      {/* On-Device Section */}
      <View className="px-4 pb-2">
        <Text className="text-muted-foreground text-xs">On-Device</Text>
      </View>

      <Pressable
        className="mx-4 mb-4 flex-row items-center gap-2 rounded-lg bg-accent/50 px-3 py-3"
        onPress={handleSelectApple}
      >
        <Icon as={Sparkles} className="size-4 text-primary" />
        <Text className="flex-1 text-foreground text-sm">
          Apple Intelligence
        </Text>
        <Icon as={Smartphone} className="size-4 text-muted-foreground" />
        <Icon as={Check} className="size-4 text-primary" />
      </Pressable>

      {/* Cloud Models Section - Blurred */}
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between pb-2">
          <Text className="text-muted-foreground text-xs">Cloud Models</Text>
          <Pressable
            className="flex-row items-center gap-1"
            onPress={handleSignIn}
          >
            <Icon as={Lock} className="size-3 text-primary" />
            <Text className="text-primary text-xs">Sign in to unlock</Text>
          </Pressable>
        </View>

        <View className="relative flex-1 overflow-hidden rounded-lg">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 60 }}
            scrollEnabled={false}
          >
            {TOP_MODELS.map((modelId) => (
              <View
                className="flex-row items-center gap-2 px-3 py-2.5"
                key={modelId}
              >
                <Text className="flex-1 text-foreground text-sm">
                  {getModelDisplayName(modelId)}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {getProviderName(modelId)}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Blur overlay */}
          <BlurView
            experimentalBlurMethod="dimezisBlurView"
            intensity={colorScheme === "dark" ? 30 : 25}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            tint={colorScheme === "dark" ? "dark" : "light"}
          />

          {/* Sign in prompt overlay */}
          <View className="absolute inset-0 items-center justify-center">
            <Pressable
              className="rounded-full bg-primary px-6 py-3"
              onPress={handleSignIn}
            >
              <Text className="font-medium text-primary-foreground text-sm">
                Sign in to access 300+ models
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
