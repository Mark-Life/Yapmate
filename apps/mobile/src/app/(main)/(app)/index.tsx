import { useEffect } from "react";
import { useChatContext } from "@/contexts/chat-context";

/**
 * Default home page - redirects to new chat
 * Users see a new chat ready to type when they open the app
 * Chats list is available via drawer menu
 */
export default function Index() {
  const { navigateToNew } = useChatContext();

  useEffect(() => {
    navigateToNew();
  }, [navigateToNew]);

  return null;
}
