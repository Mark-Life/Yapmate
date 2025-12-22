import { useEffect, useState } from "react";

type ServiceWorkerState = {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
};

/**
 * Hook for managing service worker registration and update detection
 * Detects when a new service worker is available and provides method to apply update
 */
export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    updateAvailable: false,
    registration: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    /**
     * Register service worker
     */
    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        setState((prev) => ({ ...prev, registration }));

        // Check for updates immediately
        await registration.update();

        // Listen for waiting service worker (new version available)
        if (registration.waiting) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }

        // Listen for new service worker installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker installed and waiting
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    /**
     * Handle controller change (service worker activated)
     */
    const handleControllerChange = () => {
      setState((prev) => ({ ...prev, updateAvailable: false }));
      // Reload page to get new version
      window.location.reload();
    };

    /**
     * Listen for messages from service worker
     */
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "UPDATE_AVAILABLE") {
        setState((prev) => ({ ...prev, updateAvailable: true }));
      }
    };

    registerSW();

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );
    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  /**
   * Apply update by telling waiting service worker to skip waiting
   */
  const applyUpdate = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return {
    updateAvailable: state.updateAvailable,
    applyUpdate,
  };
};
