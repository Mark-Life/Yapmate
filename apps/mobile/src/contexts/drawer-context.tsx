import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Dimensions } from "react-native";
import {
  runOnJS,
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { mediumImpact } from "@/lib/haptics";

export const DRAWER_WIDTH = Dimensions.get("window").width * 0.8;
export const ANIMATION_DURATION = 200;

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  /** Shared value for drawer position (0 = closed, DRAWER_WIDTH = open) */
  position: SharedValue<number>;
  /** Update position and sync isOpen state */
  setPositionAndState: (open: boolean) => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

type DrawerProviderProps = {
  children: React.ReactNode;
};

/**
 * Provides drawer state management with shared animated position
 * Controls open/close state and position for gesture-driven drawer
 */
export const DrawerProvider = ({ children }: DrawerProviderProps) => {
  const position = useSharedValue(0);
  // Track isOpen state with React state for render-time access
  const [isOpen, setIsOpen] = useState(false);

  const setPositionAndState = useCallback(
    (open: boolean) => {
      "worklet";
      runOnJS(setIsOpen)(open);
      runOnJS(mediumImpact)();
      position.value = withTiming(open ? DRAWER_WIDTH : 0, {
        duration: ANIMATION_DURATION,
      });
    },
    [position]
  );

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    mediumImpact();
    position.value = withTiming(DRAWER_WIDTH, { duration: ANIMATION_DURATION });
  }, [position]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    mediumImpact();
    position.value = withTiming(0, { duration: ANIMATION_DURATION });
  }, [position]);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => {
      const newOpen = !prev;
      // Update position based on new state
      position.value = withTiming(newOpen ? DRAWER_WIDTH : 0, {
        duration: ANIMATION_DURATION,
      });
      return newOpen;
    });
    mediumImpact();
  }, [position]);

  const value = useMemo(
    () => ({
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      position,
      setPositionAndState,
    }),
    [
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      position,
      setPositionAndState,
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
