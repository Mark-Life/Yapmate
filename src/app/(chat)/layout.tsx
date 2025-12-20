import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getUserChats } from "@/lib/chat-store";

type ChatLayoutProps = {
  children: React.ReactNode;
};

/**
 * Layout for chat pages - includes sidebar with chat history
 */
export default async function ChatLayout({ children }: ChatLayoutProps) {
  const chats = await getUserChats();

  return (
    <SidebarProvider>
      <AppSidebar chats={chats} />
      <SidebarInset>
        {/* <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header> */}
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

