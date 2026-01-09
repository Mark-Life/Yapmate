import {
  ConsentManagerDialog,
  ConsentManagerProvider,
  CookieBanner,
} from "@c15t/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@yapmate/components/ui/sonner";
import { useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { UpdatePrompt } from "./components/update-prompt";
import { consentOptions, consentTheme, dialogTheme } from "./consent-config";
import { UserProvider } from "./contexts/user-context";
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
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <ConsentManagerProvider options={consentOptions}>
          <UserProvider>
            <Router />
            <UpdatePrompt />
            <Toaster />
          </UserProvider>
          <CookieBanner legalLinks={["privacyPolicy"]} theme={consentTheme} />
          <ConsentManagerDialog
            legalLinks={["privacyPolicy", "termsOfService"]}
            theme={dialogTheme}
          />
        </ConsentManagerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
