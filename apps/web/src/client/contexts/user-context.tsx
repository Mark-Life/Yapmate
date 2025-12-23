"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

type User = {
  email: string | undefined;
};

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

type UserProviderProps = {
  children: React.ReactNode;
};

/**
 * Provides user context with Supabase auth
 * Fetches user on mount and listens to auth state changes
 */
export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    /**
     * Updates user state from Supabase auth user
     */
    const updateUser = (authUser: SupabaseUser | null) => {
      if (authUser) {
        setUser({ email: authUser.email });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    /**
     * Initial auth check
     */
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      updateUser(authUser);
    };

    checkAuth();

    /**
     * Listen to auth state changes (login, logout, session expiry)
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
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
