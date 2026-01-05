import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, useState } from "react";

type QueryProviderProps = {
  children: ReactNode;
};

/**
 * TanStack Query provider with AsyncStorage persistence
 * Persists chats and messages for 30 days, syncs via WebSocket
 */
export const QueryProvider = ({ children }: QueryProviderProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
          },
        },
      })
  );

  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // // Skip message queries to avoid storage bloat
            // if (query.queryKey[0] === "chat-messages") {
            //   return false;
            // }
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

// TODO: move local chats to sql
