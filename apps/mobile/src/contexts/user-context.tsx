import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { useSession } from "@/contexts/auth";
import { rpcClient } from "@/lib/rpc-client";

type User = {
  email: string | undefined;
  hideEmailInUi: boolean;
};

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
  updateHideEmailInUi: (hideEmailInUi: boolean) => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode;
};

/**
 * Provides user context with settings management
 * Fetches user settings and provides update mutation
 */
export const UserProvider = ({ children }: UserProviderProps) => {
  const { session, isLoading: isAuthLoading } = useSession();
  const queryClient = useQueryClient();

  const userId = session?.user?.id;

  /**
   * Fetch user settings from API
   */
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["userSettings", userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }
      return await rpcClient.settings.get();
    },
    enabled: Boolean(userId),
  });

  /**
   * Update hideEmailInUi setting mutation
   */
  const updateHideEmailInUiMutation = useMutation({
    mutationFn: async (hideEmailInUi: boolean) => {
      const result = await rpcClient.settings.update({ hideEmailInUi });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userSettings", userId],
      });
    },
  });

  /**
   * Computed user object combining session and settings
   */
  const getUser = (): User | null => {
    if (!session?.user) {
      return null;
    }
    return {
      email: session.user.email,
      hideEmailInUi: settings?.hideEmailInUi ?? false,
    };
  };

  const user = getUser();

  /**
   * Update hideEmailInUi setting
   */
  const updateHideEmailInUi = async (hideEmailInUi: boolean): Promise<void> => {
    await updateHideEmailInUiMutation.mutateAsync(hideEmailInUi);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: isAuthLoading || (userId !== undefined && isLoadingSettings),
        updateHideEmailInUi,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook to access user context
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
