import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import { isAuthCallbackUrl } from "@/lib/auth-linking";

/**
 * Hook to handle authentication deep links
 * Redirects auth callback URLs to the /auth/callback route for processing
 * Only processes URLs that contain auth callback parameters
 */
export function useAuthLinking() {
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }

      // Check if this is an auth callback URL
      if (isAuthCallbackUrl(url)) {
        // Parse the URL to extract query params
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.search);

          // Build route path with query params
          const queryString = params.toString();
          const routePath = `/auth/callback${queryString ? `?${queryString}` : ""}`;

          // Navigate to the callback route which will handle authentication
          router.push(routePath);
        } catch (error) {
          console.error("Error parsing auth URL:", error);
          // Fallback: try to navigate with the full URL as query
          router.push(`/auth/callback?url=${encodeURIComponent(url)}`);
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then(handleUrl);

    // Listen for URL changes while app is running
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);
}
