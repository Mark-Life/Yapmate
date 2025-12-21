"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { type ReactNode, useState } from "react";

type QueryProviderProps = {
  children: ReactNode;
};

/**
 * TanStack Query provider with localStorage persistence
 * Persists chats and models, but excludes messages to avoid storage bloat
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 1000 * 60 * 60 * 24, // 24 hours for persistence
          },
        },
      })
  );

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Skip message queries to avoid storage bloat
            if (query.queryKey[0] === "chat-messages") return false;
            // Only persist successful queries
            return query.state.status === "success";
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
