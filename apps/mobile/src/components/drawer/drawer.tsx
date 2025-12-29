import { LogOut } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatsList } from "@/components/chat/chats-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";
import { DRAWER_WIDTH, useDrawer } from "@/contexts/drawer-context";
import { lightTap } from "@/lib/haptics";

/** Edge zone width for detecting swipe-to-open gesture */
const EDGE_WIDTH = 30;
/** Velocity threshold for snap decision */
const VELOCITY_THRESHOLD = 500;
/** Position threshold (fraction of drawer width) for snap decision */
const POSITION_THRESHOLD = 0.5;

type AnimatedContentProps = {
  children: React.ReactNode;
};

/**
 * Shared pan gesture logic for opening/closing drawer
 */
const useDrawerPanGesture = () => {
  const { position, setPositionAndState } = useDrawer();
  const startPosition = useSharedValue(0);

  const createPanGesture = (alwaysActive = false) =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-20, 20])
      .onStart(() => {
        "worklet";
        startPosition.value = position.value;
      })
      .onUpdate((event) => {
        "worklet";
        if (!alwaysActive && position.value === 0 && event.translationX <= 0) {
          return;
        }
        const newPosition = startPosition.value + event.translationX;
        position.value = Math.max(0, Math.min(DRAWER_WIDTH, newPosition));
      })
      .onEnd((event) => {
        "worklet";
        const velocity = event.velocityX;
        const currentPosition = position.value;

        let shouldOpen: boolean;
        if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
          shouldOpen = velocity > 0;
        } else {
          shouldOpen = currentPosition > DRAWER_WIDTH * POSITION_THRESHOLD;
        }

        setPositionAndState(shouldOpen);
      });

  return { createPanGesture, position };
};

/**
 * Wrapper component that shifts content to the right when drawer opens
 * Handles pan gestures to open/close drawer with swipe
 */
export const AnimatedContent = ({ children }: AnimatedContentProps) => {
  const { closeDrawer, position } = useDrawer();
  const { createPanGesture } = useDrawerPanGesture();

  const closeDrawerJS = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  // Edge gesture - always active, for opening from left edge
  const edgeGesture = createPanGesture(true);

  // Content gesture - only active when drawer is open, for closing
  const contentGesture = createPanGesture(false);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(position.value, [0, DRAWER_WIDTH], [0, 1]),
  }));

  const overlayPointerEvents = useAnimatedStyle(() => ({
    pointerEvents: position.value > DRAWER_WIDTH * 0.1 ? "auto" : "none",
  }));

  return (
    <Animated.View className="flex-1" style={contentStyle}>
      <GestureDetector gesture={contentGesture}>
        <View className="flex-1">{children}</View>
      </GestureDetector>

      {/* Overlay on content - tapping closes drawer */}
      <Animated.View
        className="absolute inset-0 bg-black/10"
        style={[overlayStyle, overlayPointerEvents]}
      >
        <Pressable className="flex-1" onPress={closeDrawerJS} />
      </Animated.View>

      {/* Invisible edge zone for opening gesture - sits on top */}
      <GestureDetector gesture={edgeGesture}>
        <View
          className="absolute top-0 bottom-0 left-0"
          style={{ width: EDGE_WIDTH }}
        />
      </GestureDetector>
    </Animated.View>
  );
};

/**
 * Drawer component that slides in from the left
 * Contains the chats list and can be toggled open/closed
 * Position is driven by shared context value for gesture support
 */
export const Drawer = () => {
  const { colorScheme } = useColorScheme();
  const { position, closeDrawer } = useDrawer();
  const { session, signOut } = useSession();
  const insets = useSafeAreaInsets();

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    await signOut();
    closeDrawer();
  }, [signOut, closeDrawer]);

  /**
   * Handle user menu open change
   */
  const handleUserMenuOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      lightTap();
    }
  }, []);

  // Drawer translateX: maps position (0 to DRAWER_WIDTH) to (-DRAWER_WIDTH to 0)
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - DRAWER_WIDTH }],
  }));

  return (
    <>
      {/* Drawer content - full screen height, padding for safe area */}
      <Animated.View
        className={`absolute top-0 left-0 z-50 h-full w-[80%] bg-background ${
          colorScheme === "dark" ? "dark" : ""
        }`}
        style={drawerStyle}
      >
        <View
          className="flex-1 flex-col"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="flex-1">
            <ChatsList />
          </View>
          {session?.user ? (
            <View className="border-border border-t">
              <DropdownMenu onOpenChange={handleUserMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="w-full justify-start gap-2 px-2"
                    variant="ghost"
                  >
                    <Avatar
                      alt={session.user.email ?? "User avatar"}
                      className="size-8"
                    >
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <Text>
                          {session.user.email?.[0]?.toUpperCase() ?? "U"}
                        </Text>
                      </AvatarFallback>
                    </Avatar>
                    <Text className="truncate text-sm" numberOfLines={1}>
                      {session.user.email ?? "User"}
                    </Text>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56"
                  side="top"
                  sideOffset={8}
                >
                  <DropdownMenuItem
                    className="text-destructive"
                    onPress={handleLogout}
                    variant="destructive"
                  >
                    <Icon as={LogOut} className="size-4" />
                    <Text>Log out</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </>
  );
};
