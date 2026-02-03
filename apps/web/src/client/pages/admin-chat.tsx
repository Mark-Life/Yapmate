import { useQuery } from "@tanstack/react-query";
import { MessagesHistory } from "../components/chat/messages-history";
import { rpcClient } from "../lib/rpc-client";

/**
 * Admin-only chat viewer for debugging purposes
 * Only accessible in development mode
 */
export const AdminChatPage = ({ chatId }: { chatId: string }) => {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-chat", chatId],
    queryFn: () => rpcClient.messages.list({ chatId }),
  });

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }
  if (!messages.length) {
    return <div className="p-4">Chat not found or empty</div>;
  }

  return (
    <div className="h-screen">
      <div className="border-b p-4">
        <h1 className="font-mono text-sm">Admin: {chatId}</h1>
      </div>
      <MessagesHistory
        disabled
        messages={messages}
        onRegenerate={() => undefined}
        status="ready"
      />
    </div>
  );
};
