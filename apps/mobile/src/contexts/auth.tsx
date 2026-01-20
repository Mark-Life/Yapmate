import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearQueryCache } from "@/components/query-provider";
import { clearUserPreferences } from "@/hooks/use-user-preferences";
import { supabase } from "@/lib/supabase";
import { useStorageState } from "@/lib/useStorageState";

type AuthContextType = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    redirectTo?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<void>;
  verifyOtp: (
    email: string,
    token: string,
    type?: "email" | "magiclink"
  ) => Promise<void>;
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access the authentication context
 * @throws Error if used outside SessionProvider
 */
export function useSession(): AuthContextType {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }
  return value;
}

/**
 * Session provider component that manages authentication state
 * Uses Supabase for authentication and persists session in secure storage
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading], setSessionToken] = useStorageState("supabase_session");

  // Initialize session from Supabase
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setIsInitializing(false);
      if (initialSession) {
        setSessionToken(initialSession.access_token);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setSessionToken(newSession.access_token);
      } else {
        setSessionToken(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSessionToken]);

  const signIn = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSessionToken(data.session.access_token);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    redirectTo?: string
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSessionToken(data.session.access_token);
    }
  };

  const signOut = async (): Promise<void> => {
    // Clear cached data before signing out to prevent cross-user data leaks
    await Promise.all([clearQueryCache(), clearUserPreferences()]);
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setSessionToken(null);
  };

  const sendMagicLink = async (
    email: string,
    redirectTo?: string
  ): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      throw error;
    }
  };

  const verifyOtp = async (
    email: string,
    token: string,
    type: "email" | "magiclink" = "email"
  ): Promise<void> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      setSessionToken(data.session.access_token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signUp,
        signOut,
        sendMagicLink,
        verifyOtp,
        session,
        isLoading: isLoading || isInitializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
