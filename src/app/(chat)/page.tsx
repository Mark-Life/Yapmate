"use client";

import { useSearchParams } from "next/navigation";
import { Chat } from "@/components/chat";

/**
 * Home page - renders new chat without creating DB entry
 * Chat entity is created on first message
 */
export default function Page() {
  const searchParams = useSearchParams();
  // Use the 'new' query param as key to force Chat remount on each "New Chat" click
  const sessionKey = searchParams.get("new") ?? "default";

  return <Chat key={sessionKey} />;
}
