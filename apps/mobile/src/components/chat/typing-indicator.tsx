/**
 * Typing indicator for multi-user chats
 * Shows animated dots with names of users who are typing
 */
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { getThemeColors } from "@/lib/colors";

type TypingIndicatorProps = {
  typingMembers: Map<string, string>;
};

/**
 * Animated dot component for typing indicator
 */
const AnimatedDot = ({ delay }: { delay: number }) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: theme.mutedForeground },
        animatedStyle,
      ]}
    />
  );
};

/**
 * Formats typing members into a readable string
 */
const formatTypingText = (typingMembers: Map<string, string>): string => {
  const names = Array.from(typingMembers.values());
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return `${names[0]} is typing`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing`;
  }
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more are typing`;
};

/**
 * Renders typing indicator with animated dots and user names
 */
export const TypingIndicator = ({ typingMembers }: TypingIndicatorProps) => {
  if (typingMembers.size === 0) {
    return null;
  }

  const text = formatTypingText(typingMembers);

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <AnimatedDot delay={0} />
        <AnimatedDot delay={200} />
        <AnimatedDot delay={400} />
      </View>
      <Text className="text-muted-foreground text-sm">{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
