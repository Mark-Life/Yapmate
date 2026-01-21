import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, Platform } from "react-native";
import {
  runOnJS,
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { mediumImpact } from "@/lib/haptics";

export const ANIMATION_DURATION = 200;

/** Max width for permanent sidebar on iPad landscape */
const PERMANENT_SIDEBAR_WIDTH = 320;
/** Drawer width as percentage of screen for iPad portrait */
const IPAD_PORTRAIT_DRAWER_RATIO = 0.4;
/** Drawer width as percentage of screen for iPhone */
const PHONE_DRAWER_RATIO = 0.8;

type LayoutMode = "phone" | "ipad-portrait" | "ipad-landscape";

/**
 * Determines layout mode based on device and orientation
 */
const getLayoutMode = (width: number, height: number): LayoutMode => {
  const isLandscape = width > height;
  // iPad detection: Platform.isPad or large screen (tablet-sized)
  const isTablet = Platform.OS === "ios" && Math.min(width, height) >= 768;

  if (!isTablet) {
    return "phone";
  }
  return isLandscape ? "ipad-landscape" : "ipad-portrait";
};

/**
 * Calculates drawer width based on layout mode
 */
const getDrawerWidth = (mode: LayoutMode, screenWidth: number): number => {
  switch (mode) {
    case "ipad-landscape":
      return PERMANENT_SIDEBAR_WIDTH;
    case "ipad-portrait":
      return screenWidth * IPAD_PORTRAIT_DRAWER_RATIO;
    default:
      return screenWidth * PHONE_DRAWER_RATIO;
  }
};

/**
 * Hook for responsive drawer dimensions and behavior
 */
export const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const layoutMode = getLayoutMode(dimensions.width, dimensions.height);
  const drawerWidth = getDrawerWidth(layoutMode, dimensions.width);
  const isPermanent = layoutMode === "ipad-landscape";

  return { layoutMode, drawerWidth, isPermanent, dimensions };
};

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  /** Shared value for drawer position (0 = closed, drawerWidth = open) */
  position: SharedValue<number>;
  /** Update position and sync isOpen state */
  setPositionAndState: (open: boolean) => void;
  /** Current drawer width (responsive to device/orientation) */
  drawerWidth: number;
  /** Whether sidebar is permanently visible (iPad landscape) */
  isPermanent: boolean;
  /** Current layout mode */
  layoutMode: LayoutMode;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

type DrawerProviderProps = {
  children: React.ReactNode;
};

/**
 * Provides drawer state management with shared animated position
 * Controls open/close state and position for gesture-driven drawer
 * Adapts to device type and orientation (phone, iPad portrait, iPad landscape)
 */
export const DrawerProvider = ({ children }: DrawerProviderProps) => {
  const { drawerWidth, isPermanent, layoutMode } = useResponsiveLayout();
  const position = useSharedValue(isPermanent ? drawerWidth : 0);
  // Track isOpen state with React state for render-time access
  const [isOpen, setIsOpen] = useState(isPermanent);

  // Sync position when layout mode changes (e.g., rotation)
  useEffect(() => {
    if (isPermanent) {
      position.value = withTiming(drawerWidth, {
        duration: ANIMATION_DURATION,
      });
      setIsOpen(true);
    } else {
      position.value = withTiming(0, { duration: ANIMATION_DURATION });
      setIsOpen(false);
    }
  }, [isPermanent, drawerWidth, position]);

  const setPositionAndState = useCallback(
    (open: boolean) => {
      "worklet";
      if (isPermanent) {
        return; // No toggle in permanent mode
      }
      runOnJS(setIsOpen)(open);
      runOnJS(mediumImpact)();
      position.value = withTiming(open ? drawerWidth : 0, {
        duration: ANIMATION_DURATION,
      });
    },
    [position, drawerWidth, isPermanent]
  );

  const openDrawer = useCallback(() => {
    if (isPermanent) {
      return;
    }
    setIsOpen(true);
    mediumImpact();
    position.value = withTiming(drawerWidth, { duration: ANIMATION_DURATION });
  }, [position, drawerWidth, isPermanent]);

  const closeDrawer = useCallback(() => {
    if (isPermanent) {
      return;
    }
    setIsOpen(false);
    mediumImpact();
    position.value = withTiming(0, { duration: ANIMATION_DURATION });
  }, [position, isPermanent]);

  const toggleDrawer = useCallback(() => {
    if (isPermanent) {
      return;
    }
    setIsOpen((prev) => {
      const newOpen = !prev;
      position.value = withTiming(newOpen ? drawerWidth : 0, {
        duration: ANIMATION_DURATION,
      });
      return newOpen;
    });
    mediumImpact();
  }, [position, drawerWidth, isPermanent]);

  const value = useMemo(
    () => ({
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      position,
      setPositionAndState,
      drawerWidth,
      isPermanent,
      layoutMode,
    }),
    [
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      position,
      setPositionAndState,
      drawerWidth,
      isPermanent,
      layoutMode,
    ]
  );

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
};

/**
 * Hook to access drawer context
 */
export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error("useDrawer must be used within DrawerProvider");
  }
  return context;
};
