import { useCallback, useEffect, useRef, useState } from "react";

type ServiceWorkerState = {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
};

/**
 * Hook for managing service worker registration and update detection
 * Detects when a new service worker is available and provides method to apply update
 * Includes periodic update checks for iOS PWA compatibility
 */
export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    updateAvailable: false,
    registration: null,
  });

  const checkIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    /**
     * Check for service worker updates
     */
    const checkForUpdate = async () => {
      if (!registration) {
        return;
      }

      try {
        await registration.update();

        // Check if there's a waiting service worker
        if (registration.waiting) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
          return;
        }

        // Also check installing state
        if (registration.installing) {
          const installingWorker = registration.installing;
          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        }

        // Request service worker to check for updates
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "CHECK_UPDATE",
          });
        }
      } catch (error) {
        console.warn("Update check failed:", error);
      }
    };

    /**
     * Register service worker
     */
    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // Always check for updates
        });

        setState((prev) => ({ ...prev, registration }));

        // Check for updates immediately
        await checkForUpdate();

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

        // Periodic update checks (every 5 minutes) - important for iOS
        // iOS PWAs don't check for updates as frequently as desktop browsers
        checkIntervalRef.current = window.setInterval(
          () => {
            checkForUpdate();
          },
          5 * 60 * 1000
        ); // 5 minutes

        // Also check when app becomes visible (user returns to app)
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            checkForUpdate();
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
          );
        };
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    /**
     * Listen for messages from service worker
     */
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "UPDATE_AVAILABLE") {
        setState((prev) => ({ ...prev, updateAvailable: true }));
      }
    };

    // Track if we already had a controller before registering
    // This prevents reload on first install (Safari fires controllerchange immediately)
    const hadControllerBeforeRegister =
      navigator.serviceWorker.controller !== null;

    /**
     * Handle controller change - only reload on actual updates, not first install
     */
    const handleControllerChange = () => {
      setState((prev) => ({ ...prev, updateAvailable: false }));
      if (hadControllerBeforeRegister) {
        window.location.reload();
      }
    };

    registerSW();

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );
    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      if (checkIntervalRef.current !== null) {
        clearInterval(checkIntervalRef.current);
      }
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
  const applyUpdate = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
      // The controllerchange event will trigger a reload
    } else {
      // If no waiting worker, force a reload to check for updates
      window.location.reload();
    }
  }, [state.registration]);

  /**
   * Force check for updates manually
   */
  const checkForUpdate = useCallback(async () => {
    if (state.registration) {
      try {
        await state.registration.update();
        if (state.registration.waiting) {
          setState((prev) => ({ ...prev, updateAvailable: true }));
        }
      } catch (error) {
        console.error("Manual update check failed:", error);
      }
    }
  }, [state.registration]);

  return {
    updateAvailable: state.updateAvailable,
    applyUpdate,
    checkForUpdate,
  };
};
