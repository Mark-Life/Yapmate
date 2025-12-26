import { SplashScreen } from "expo-router";
import { useSession } from "@/contexts/auth";

SplashScreen.preventAutoHideAsync();

/**
 * Splash screen controller component
 * Keeps the splash screen visible until authentication state is loaded
 */
export function SplashScreenController() {
  const { isLoading } = useSession();

  if (!isLoading) {
    SplashScreen.hideAsync();
  }

  return null;
}

// Default export for Expo Router (even though this is not a route)
export default SplashScreenController;
