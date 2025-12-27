import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { Dimensions, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ChatsList } from "@/components/chat/chats-list";
import { useDrawer } from "@/contexts/drawer-context";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.8;
const ANIMATION_DURATION = 200;

/**
 * Drawer component that slides in from the left
 * Contains the chats list and can be toggled open/closed
 */
export const Drawer = () => {
  const { colorScheme } = useColorScheme();
  const { isOpen, closeDrawer } = useDrawer();
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
      overlayOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: ANIMATION_DURATION,
      });
      overlayOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }
  }, [isOpen, translateX, overlayOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: isOpen ? "auto" : "none",
  }));

  return (
    <>
      {/* Overlay backdrop */}
      <Animated.View
        className="absolute inset-0 z-40 bg-black/50"
        pointerEvents={isOpen ? "auto" : "none"}
        style={overlayStyle}
      >
        <Pressable className="flex-1" onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer content */}
      <Animated.View
        className={`absolute top-0 left-0 z-50 h-full w-[80%] bg-background shadow-lg ${
          colorScheme === "dark" ? "dark" : ""
        }`}
        style={drawerStyle}
      >
        <View className="flex-1">
          <ChatsList />
        </View>
      </Animated.View>
    </>
  );
};
