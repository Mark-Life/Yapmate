/**
 * Hook for fetching user rules
 * Uses TanStack Query with caching
 */
import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/rpc-client";

/**
 * Fetches and caches user rules from the API
 * Rules are used to customize AI behavior per-chat
 */
export const useRules = () => {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["userRules"],
    queryFn: () => rpcClient.userRules.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { rules, isLoading };
};
