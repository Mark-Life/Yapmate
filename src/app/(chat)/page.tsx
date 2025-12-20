"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Chat } from "@/components/chat";

/**
 * Component that reads search params and renders Chat
 */
const ChatWithSearchParams = () => {
  const searchParams = useSearchParams();
  // Use the 'new' query param as key to force Chat remount on each "New Chat" click
  const sessionKey = searchParams.get("new") ?? "default";

  return <Chat key={sessionKey} />;
};

/**
 * Home page - renders new chat without creating DB entry
 * Chat entity is created on first message
 */
export default function Page() {
  return (
    <Suspense fallback={<Chat />}>
      <ChatWithSearchParams />
    </Suspense>
  );
}
