import type { Session } from "@supabase/supabase-js";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { AuthContainer } from "@/components/auth/AuthContainer";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSession } from "@/contexts/auth";
import { createSessionFromUrl } from "@/lib/auth-linking";

/**
 * Auth callback route handler
 * Processes magic link authentication URLs
 * Shows loading state, then redirects on success or shows error
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>();
  const { session } = useSession();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleError = useCallback((message: string) => {
    setStatus("error");
    setErrorMessage(message);
  }, []);

  const handleSuccess = useCallback(() => {
    setStatus("success");
    setTimeout(() => {
      router.replace("/");
    }, 500);
  }, []);

  const buildAuthUrl = useCallback((): string | null => {
    if (params.error) {
      handleError(
        params.error_description ||
          params.error ||
          "An error occurred during authentication"
      );
      return null;
    }

    if (!(params.token_hash && params.type)) {
      handleError("Invalid authentication link. Missing required parameters.");
      return null;
    }

    const urlParams = new URLSearchParams();
    urlParams.set("token_hash", params.token_hash);
    urlParams.set("type", params.type);
    return `yapmate://auth/callback?${urlParams.toString()}`;
  }, [params, handleError]);

  const processAuthResult = useCallback(
    (newSession: Session | null, error: Error | null) => {
      if (newSession) {
        handleSuccess();
      } else if (error) {
        handleError(
          error instanceof Error
            ? error.message
            : "Failed to authenticate. Please try again."
        );
      } else {
        handleError("Invalid authentication link. Please try again.");
      }
    },
    [handleError, handleSuccess]
  );

  useEffect(() => {
    if (session) {
      router.replace("/");
      return;
    }

    const processAuth = async () => {
      const url = buildAuthUrl();
      if (!url) {
        return;
      }

      try {
        const { session: newSession, error } = await createSessionFromUrl(url);
        processAuthResult(newSession, error);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        );
      }
    };

    processAuth();
  }, [session, buildAuthUrl, processAuthResult, handleError]);

  const handleRetry = () => {
    router.replace("/sign-in");
  };

  if (status === "loading") {
    return (
      <AuthContainer subtitle="Authenticating..." title="Please wait">
        <View className="items-center justify-center py-8">
          <Text className="text-center text-muted-foreground">
            Verifying your authentication link...
          </Text>
        </View>
      </AuthContainer>
    );
  }

  if (status === "success") {
    return (
      <AuthContainer subtitle="Success!" title="Authenticated">
        <View className="items-center justify-center py-8">
          <Text className="text-center text-muted-foreground">
            Redirecting you to the app...
          </Text>
        </View>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer subtitle="Authentication failed" title="Unable to sign in">
      <View className="gap-4">
        <View className="rounded-lg bg-destructive/10 p-4">
          <Text className="text-center text-destructive text-sm">
            {errorMessage || "An error occurred during authentication"}
          </Text>
        </View>

        <Button onPress={handleRetry}>
          <Text className="font-medium text-primary-foreground">Try Again</Text>
        </Button>
      </View>
    </AuthContainer>
  );
}
