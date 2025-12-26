import { Redirect, Slot } from "expo-router";
import { Text } from "react-native";

import { useSession } from "@/contexts/auth";
import { ChatProvider } from "@/contexts/chat-context";

/**
 * Layout for authenticated app routes
 * Redirects to sign-in if user is not authenticated
 */
export default function AppLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ChatProvider>
      <Slot />
    </ChatProvider>
  );
}
