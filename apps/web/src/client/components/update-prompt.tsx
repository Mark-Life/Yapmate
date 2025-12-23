import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useServiceWorker } from "../hooks/use-service-worker";

/**
 * Component that shows update prompt when new service worker version is available
 * Uses sonner toast with action button to trigger update
 * Designed to work well on iOS PWAs which have stricter update mechanisms
 */
export const UpdatePrompt = () => {
  const { updateAvailable, applyUpdate } = useServiceWorker();
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!updateAvailable) {
      // Dismiss any existing toast when update is no longer available
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    // Only show one toast at a time - don't re-trigger if already showing
    if (toastIdRef.current !== null) {
      return;
    }

    const toastId = toast.info("Update available", {
      description: "A new version of the app is ready. Click to update now.",
      action: {
        label: "Update Now",
        onClick: () => {
          applyUpdate();
          toast.dismiss(toastId);
          toastIdRef.current = null;
        },
      },
      duration: Number.POSITIVE_INFINITY, // Don't auto-dismiss
      dismissible: true, // Allow manual dismiss
      onDismiss: () => {
        toastIdRef.current = null;
      },
    });

    toastIdRef.current = toastId;

    return () => {
      if (toastIdRef.current === toastId) {
        toast.dismiss(toastId);
        toastIdRef.current = null;
      }
    };
  }, [updateAvailable, applyUpdate]);

  return null;
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
