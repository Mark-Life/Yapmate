import { useEffect } from "react";
import { toast } from "sonner";
import { useServiceWorker } from "@/client/hooks/use-service-worker";

/**
 * Component that shows update prompt when new service worker version is available
 * Uses sonner toast with action button to trigger update
 */
export const UpdatePrompt = () => {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  useEffect(() => {
    if (!updateAvailable) {
      return;
    }

    const toastId = toast.info("Update available", {
      description: "A new version of the app is ready. Click to update now.",
      action: {
        label: "Update",
        onClick: () => {
          applyUpdate();
          toast.dismiss(toastId);
        },
      },
      duration: Number.POSITIVE_INFINITY, // Don't auto-dismiss
      dismissible: false, // User must click update or dismiss manually
    });

    return () => {
      toast.dismiss(toastId);
    };
  }, [updateAvailable, applyUpdate]);

  return null;
};
