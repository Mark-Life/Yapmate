import { Redirect, Slot } from "expo-router";
import { useSession } from "@/contexts/auth";
import { ChatProvider } from "@/contexts/chat-context";

/**
 * Layout for authenticated app routes
 * Redirects unauthenticated users to sign-in
 */
export default function AppLayout() {
  const { session, isLoading } = useSession();

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Redirect to sign-in if not authenticated
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ChatProvider>
      <Slot />
    </ChatProvider>
  );
}
