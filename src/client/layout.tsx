import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/client/components/theme-provider";
import { Toaster } from "@/client/components/ui/sonner";
import { UpdatePrompt } from "@/client/components/update-prompt";
import { UserProvider } from "@/client/contexts/user-context";
import { Router } from "./router";

/**
 * Creates a QueryClient instance with default options
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });

/**
 * Main App component with providers
 */
export const App = () => {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserProvider>
          <Router />
          <UpdatePrompt />
          <Toaster />
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
