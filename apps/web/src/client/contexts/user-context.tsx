"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { createContext, useContext, useEffect, useState } from "react";
import { rpcClient } from "../lib/rpc-client";
import { createClient } from "../lib/supabase/client";

type User = {
  id: string;
  email: string | undefined;
  hideEmailInUi: boolean;
  useSerifFont: boolean;
};

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
  updateHideEmailInUi: (hideEmailInUi: boolean) => Promise<void>;
  updateUseSerifFont: (useSerifFont: boolean) => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

type UserProviderProps = {
  children: React.ReactNode;
};

/**
 * Provides user context with Supabase auth
 * Fetches user on mount and listens to auth state changes
 * Identifies users in PostHog when they log in
 * Fetches and manages user settings (hideEmailInUi)
 */
export const UserProvider = ({ children }: UserProviderProps) => {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  /**
   * Fetch user settings from API
   */
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["userSettings", authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) {
        return null;
      }
      return await rpcClient.settings.get();
    },
    enabled: Boolean(authUser?.id),
  });

  /**
   * Update hideEmailInUi setting
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
        queryKey: ["userSettings", authUser?.id],
      });
    },
  });

  /**
   * Update useSerifFont setting
   */
  const updateUseSerifFontMutation = useMutation({
    mutationFn: async (useSerifFont: boolean) => {
      const result = await rpcClient.settings.update({ useSerifFont });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userSettings", authUser?.id],
      });
    },
  });

  /**
   * Computed user object combining auth user and settings
   */
  const getUser = (): User | null => {
    if (!authUser) {
      return null;
    }
    if (settings) {
      return {
        id: authUser.id,
        email: authUser.email,
        hideEmailInUi: settings.hideEmailInUi,
        useSerifFont: settings.useSerifFont,
      };
    }
    return {
      id: authUser.id,
      email: authUser.email,
      hideEmailInUi: false,
      useSerifFont: true, // Default until settings load
    };
  };

  const user = getUser();

  /**
   * Update hideEmailInUi setting
   */
  const updateHideEmailInUi = async (hideEmailInUi: boolean): Promise<void> => {
    await updateHideEmailInUiMutation.mutateAsync(hideEmailInUi);
  };

  /**
   * Update useSerifFont setting
   */
  const updateUseSerifFont = async (useSerifFont: boolean): Promise<void> => {
    await updateUseSerifFontMutation.mutateAsync(useSerifFont);
  };

  useEffect(() => {
    const supabase = createClient();

    /**
     * Updates auth user state from Supabase auth user
     * Identifies user in PostHog when authenticated
     */
    const updateAuthUser = (supabaseUser: SupabaseUser | null) => {
      setAuthUser(supabaseUser);
      if (supabaseUser) {
        // Identify user in PostHog
        if (posthog && supabaseUser.id) {
          posthog.identify(supabaseUser.id, {
            email: supabaseUser.email,
          });
        }
      } else if (posthog) {
        // Reset PostHog identification on logout
        posthog.reset();
      }
      setIsLoading(false);
    };

    /**
     * Initial auth check
     */
    const checkAuth = async () => {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      updateAuthUser(supabaseUser);
    };

    checkAuth();

    /**
     * Listen to auth state changes (login, logout, session expiry)
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [posthog]);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading: isLoading || (authUser !== null && isLoadingSettings),
        updateHideEmailInUi,
        updateUseSerifFont,
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
