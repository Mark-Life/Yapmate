import { Slot } from "expo-router";
import { useAuthLinking } from "@/hooks/useAuthLinking";

/**
 * Main layout wrapper for all routes
 * Handles authentication deep links within navigation context
 */
export default function MainLayout() {
  return (
    <>
      <AuthLinkingHandler />
      <Slot />
    </>
  );
}

/**
 * Component to handle authentication deep links
 * Must be inside navigation context to use router
 */
function AuthLinkingHandler() {
  useAuthLinking();
  return null;
}
