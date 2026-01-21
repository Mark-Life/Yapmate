import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Plus, Search, Settings } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatsList } from "@/components/chat/chats-list";
import { Button as UIButton } from "@/components/ui/button";
import { GlassWrapper } from "@/components/ui/glass-wrapper";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";
import { useChatContext } from "@/contexts/chat-context";
import { useDrawer } from "@/contexts/drawer-context";
import { useUser } from "@/contexts/user-context";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
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

type DrawerContentProps = {
  colorScheme: "light" | "dark" | undefined;
  session: ReturnType<typeof useSession>["session"];
  user: ReturnType<typeof useUser>["user"];
  insets: ReturnType<typeof useSafeAreaInsets>;
  keyboardHeight: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSettings: () => void;
  handleLogout: () => Promise<void>;
  handleNewChat: () => void;
};

/**
 * Inner content of the drawer - extracted for reuse in permanent and animated modes
 */
const DrawerContent = ({
  colorScheme,
  session,
  user,
  insets,
  keyboardHeight,
  searchQuery,
  setSearchQuery,
  handleSettings,
  handleLogout,
  handleNewChat,
}: DrawerContentProps) => (
  <View className="flex-1 flex-col">
    <View className="flex-1">
      <ChatsList searchQuery={searchQuery} />
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? ["#0a0a0a", "rgba(10, 10, 10, 0.8)", "rgba(10, 10, 10, 0)"]
            : ["#f5f5f5", "rgba(245, 245, 245, 0.8)", "rgba(245, 245, 245, 0)"]
        }
        locations={[0, 0.5, 1]}
        pointerEvents="none"
        style={styles.fadeOverlayTop}
      />
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? ["rgba(10, 10, 10, 0)", "rgba(10, 10, 10, 0.8)", "#0a0a0a"]
            : ["rgba(245, 245, 245, 0)", "rgba(245, 245, 245, 0.8)", "#f5f5f5"]
        }
        locations={[0, 0.5, 1]}
        pointerEvents="none"
        style={styles.fadeOverlayBottom}
      />
    </View>
    {/* Settings and email overlay at top */}
    {session?.user ? (
      <View
        className="absolute right-0 left-0 flex-row items-center gap-2 px-2"
        style={{ top: insets.top }}
      >
        <GlassWrapper
          style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
        >
          <UIButton
            className="size-10"
            onPress={handleSettings}
            variant="ghost"
          >
            <Icon as={Settings} className="text-foreground" size={20} />
          </UIButton>
        </GlassWrapper>
        <View className="flex-1">
          <Host>
            <ContextMenu activationMethod="longPress">
              <ContextMenu.Items>
                {/* biome-ignore lint/a11y/useValidAriaRole: swift-ui */}
                <Button
                  onPress={handleLogout}
                  role="destructive"
                  systemImage="rectangle.portrait.and.arrow.right"
                >
                  Log out
                </Button>
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <GlassWrapper
                  style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
                >
                  <UIButton
                    className="w-full justify-start gap-2 overflow-hidden rounded-full"
                    variant="ghost"
                  >
                    <Text className="flex-1 text-sm" numberOfLines={1}>
                      {user?.hideEmailInUi
                        ? "redacted@email.com"
                        : (session.user.email ?? "User")}
                    </Text>
                    {user?.hideEmailInUi ? (
                      <BlurView
                        className="absolute inset-0 rounded-full"
                        intensity={30}
                        style={{ borderRadius: 32 }}
                        tint={colorScheme === "dark" ? "dark" : "light"}
                      />
                    ) : null}
                  </UIButton>
                </GlassWrapper>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
        </View>
      </View>
    ) : null}
    {/* New Chat button and Search input overlay at bottom */}
    <View
      className="absolute right-0 left-0 flex-row items-center gap-2 px-4"
      style={{
        bottom: keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom,
      }}
    >
      <GlassWrapper
        style={{ borderRadius: 32, padding: 1, overflow: "hidden" }}
      >
        <UIButton className="size-9" onPress={handleNewChat} variant="ghost">
          <Icon as={Plus} className="text-primary" size={22} />
        </UIButton>
      </GlassWrapper>
      <View className="flex-1">
        <GlassWrapper
          style={{ borderRadius: 32, padding: 1, overflow: "hidden" }}
        >
          <View className="relative flex-row items-center">
            <Icon
              as={Search}
              className="absolute left-3 size-4 text-muted-foreground"
            />
            <Input
              className="h-9 flex-1 rounded-none border-0 bg-transparent pr-3 pl-10"
              onChangeText={setSearchQuery}
              placeholder="Search chats..."
              value={searchQuery}
            />
          </View>
        </GlassWrapper>
      </View>
    </View>
  </View>
);

// StyleSheet needs to be defined before DrawerContent uses it
const styles = StyleSheet.create({
  fadeOverlayTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  fadeOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
});

/**
 * Shared pan gesture logic for opening/closing drawer
 */
const useDrawerPanGesture = () => {
  const { position, setPositionAndState, drawerWidth, isPermanent } =
    useDrawer();
  const startPosition = useSharedValue(0);

  const createPanGesture = (alwaysActive = false) =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-20, 20])
      .enabled(!isPermanent) // Disable gestures in permanent mode
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
        position.value = Math.max(0, Math.min(drawerWidth, newPosition));
      })
      .onEnd((event) => {
        "worklet";
        const velocity = event.velocityX;
        const currentPosition = position.value;

        let shouldOpen: boolean;
        if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
          shouldOpen = velocity > 0;
        } else {
          shouldOpen = currentPosition > drawerWidth * POSITION_THRESHOLD;
        }

        setPositionAndState(shouldOpen);
      });

  return { createPanGesture, position, drawerWidth };
};

/**
 * Wrapper component that shifts content to the right when drawer opens
 * Handles pan gestures to open/close drawer with swipe
 * In permanent mode (iPad landscape), renders as static flexbox layout
 */
export const AnimatedContent = ({ children }: AnimatedContentProps) => {
  const { closeDrawer, position, drawerWidth, isPermanent } = useDrawer();
  const { createPanGesture } = useDrawerPanGesture();

  const closeDrawerJS = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  // Edge gesture - always active, for opening from left edge
  const edgeGesture = createPanGesture(true);

  // Content gesture - only active when drawer is open, for closing
  const contentGesture = createPanGesture(false);

  const contentStyle = useAnimatedStyle(() => ({
    transform: isPermanent ? [] : [{ translateX: position.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(position.value, [0, drawerWidth], [0, 1]),
  }));

  const overlayPointerEvents = useAnimatedStyle(() => ({
    pointerEvents: position.value > drawerWidth * 0.1 ? "auto" : "none",
  }));

  // In permanent mode, just render children with max-width constraint
  if (isPermanent) {
    return (
      <View className="flex-1 items-center">
        <View className="max-w-4xl flex-1 self-stretch">{children}</View>
      </View>
    );
  }

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
 * In permanent mode (iPad landscape), renders as static sidebar
 */
export const Drawer = () => {
  const { colorScheme } = useColorScheme();
  const { position, closeDrawer, drawerWidth, isPermanent } = useDrawer();
  const { session, signOut } = useSession();
  const { user } = useUser();
  const { navigateToNew } = useChatContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { capture } = useAnalytics();

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    lightTap();
    capture(AnalyticsEvents.USER_SIGNED_OUT);
    await signOut();
    if (!isPermanent) {
      closeDrawer();
    }
  }, [signOut, closeDrawer, capture, isPermanent]);

  /**
   * Handle new chat creation and close drawer (only on non-permanent)
   */
  const handleNewChat = useCallback(() => {
    capture(AnalyticsEvents.CHAT_CREATED);
    navigateToNew();
    if (!isPermanent) {
      closeDrawer();
    }
  }, [navigateToNew, closeDrawer, capture, isPermanent]);

  /**
   * Handle settings navigation
   */
  const handleSettings = useCallback(() => {
    lightTap();
    router.push("/settings");
  }, [router]);

  /**
   * Track keyboard height for absolutely positioned buttons
   */
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    // Use 'will' events on iOS for smoother animations, 'did' events on Android
    const showEventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEventName, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEventName, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animated drawer style - must be called unconditionally (hooks rule)
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - drawerWidth }],
  }));

  // In permanent mode, render as static sidebar
  if (isPermanent) {
    return (
      <View
        className={`h-full border-border border-r bg-background ${
          colorScheme === "dark" ? "dark" : ""
        }`}
        style={{ width: drawerWidth }}
      >
        <DrawerContent
          colorScheme={colorScheme}
          handleLogout={handleLogout}
          handleNewChat={handleNewChat}
          handleSettings={handleSettings}
          insets={insets}
          keyboardHeight={keyboardHeight}
          searchQuery={searchQuery}
          session={session}
          setSearchQuery={setSearchQuery}
          user={user}
        />
      </View>
    );
  }

  return (
    <Animated.View
      className={`absolute top-0 left-0 z-50 h-full border-border border-r bg-background ${
        colorScheme === "dark" ? "dark" : ""
      }`}
      style={[drawerStyle, { width: drawerWidth }]}
    >
      <DrawerContent
        colorScheme={colorScheme}
        handleLogout={handleLogout}
        handleNewChat={handleNewChat}
        handleSettings={handleSettings}
        insets={insets}
        keyboardHeight={keyboardHeight}
        searchQuery={searchQuery}
        session={session}
        setSearchQuery={setSearchQuery}
        user={user}
      />
    </Animated.View>
  );
};
