import { redirect } from "next/navigation";
import { createChat } from "@/lib/chat-store";

/**
 * Home page - creates a new chat and redirects to it
 */
export default async function Page() {
  const id = await createChat();
  redirect(`/chat/${id}`);
}
