import { Stack } from "expo-router/stack";

import { ChatProvider } from "@/contexts/chat-context";

/**
 * Layout for authenticated app routes
 * Protection is handled at root level via Stack.Protected
 */
export default function AppLayout() {
  return (
    <ChatProvider>
      <Stack />
    </ChatProvider>
  );
}
