import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import { createSessionFromUrl } from "@/lib/auth-linking";

/**
 * Hook to handle authentication deep links
 * Processes magic link URLs when app is opened via deep link
 */
export function useAuthLinking() {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (url) {
        try {
          console.log("Received deep link URL:", url);
          const { session, error } = await createSessionFromUrl(url);
          if (session) {
            Alert.alert("Success", "You have been successfully authenticated!");
            router.replace("/");
          } else if (error) {
            console.error("Error creating session from URL:", error);
            Alert.alert("Error", "Failed to authenticate. Please try again.");
          }
        } catch (error) {
          console.error("Error processing auth URL:", error);
          Alert.alert("Error", "Failed to authenticate. Please try again.");
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
