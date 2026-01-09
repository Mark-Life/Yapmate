import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";

/** AsyncStorage key used by react-query-persist-client */
const REACT_QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

/** Shared QueryClient instance for use across the app */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  },
});

/**
 * Clears all React Query cache from memory and AsyncStorage
 * Call this on logout to prevent cross-user data leaks
 */
export const clearQueryCache = async (): Promise<void> => {
  queryClient.clear();
  await AsyncStorage.removeItem(REACT_QUERY_CACHE_KEY);
};

type QueryProviderProps = {
  children: ReactNode;
};

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

/**
 * TanStack Query provider with AsyncStorage persistence
 * Persists chats and messages for 30 days, syncs via WebSocket
 */
export const QueryProvider = ({ children }: QueryProviderProps) => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries
          return query.state.status === "success";
        },
      },
    }}
  >
    {children}
  </PersistQueryClientProvider>
);

// TODO: move local chats to sql
