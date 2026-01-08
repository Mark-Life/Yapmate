/**
 * Upgrade sheet component - displays pricing cards and handles Stripe checkout
 */
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  PricingCards,
  type PricingTier,
} from "@yapmate/components/ui/pricing-cards";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@yapmate/components/ui/sheet";
import { useCallback, useMemo, useState } from "react";
import { rpcClient } from "../lib/rpc-client";
import { getStripeBrandingColors } from "../styles/colors";
import { useTheme } from "./theme-provider";

/**
 * Lazy-loaded Stripe promise
 * Only initialized when actually needed (when checkout is shown)
 * This prevents Stripe telemetry requests from being blocked by ad blockers
 * when the component is imported but not used
 */
let stripePromise: ReturnType<typeof loadStripe> | null = null;

/**
 * Gets or creates Stripe promise lazily
 * Only loads Stripe.js when checkout is actually needed
 */
const getStripePromise = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
  }
  return stripePromise;
};

type UpgradeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: PricingTier | null;
  onSuccess?: () => void;
};

/**
 * Sheet component for upgrading subscription
 * Shows pricing cards, then embedded Stripe checkout on selection
 */
export const UpgradeSheet = ({
  open,
  onOpenChange,
  currentTier = null,
  onSuccess,
}: UpgradeSheetProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkingCustomer, setIsLinkingCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Get current theme (resolve 'system' to actual theme)
  const currentTheme = useMemo<"light" | "dark">(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }, [theme]);

  /**
   * Opens Stripe Customer Portal for managing subscription
   * Used for current tier, downgrades, and canceling (free tier)
   * Portal opens in new tab, sheet closes, and app-sidebar focus listener handles refresh
   */
  const handleManageSubscription = useCallback(async () => {
    try {
      const { url } = await rpcClient.subscription.createPortalSession();
      // Open Stripe Customer Portal in new tab
      window.open(url, "_blank");
      // Close sheet after opening portal
      onOpenChange(false);
      // Note: Subscription refresh handled by window focus listener in app-sidebar
    } catch (err) {
      console.error("Failed to open portal:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to open subscription management portal"
      );
    }
  }, [onOpenChange]);

  /**
   * Creates checkout session and gets client secret
   * Used for upgrades only
   */
  const handleSelectTier = useCallback(
    async (priceId: string) => {
      setIsLoading(true);
      try {
        // Get branding colors for the current theme
        const colors = getStripeBrandingColors(currentTheme);

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            theme: currentTheme,
            colors: { primary: colors.primary, background: colors.background },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { clientSecret: secret } = await response.json();
        setClientSecret(secret);
      } catch (checkoutError) {
        console.error("Checkout error:", checkoutError);
      } finally {
        setIsLoading(false);
      }
    },
    [theme]
  );

  /**
   * Handle checkout completion
   * Links Stripe customer ID to user account, then closes sheet
   * Note: Stripe's onComplete receives { sessionId } but types may not reflect this
   */
  const handleComplete = useCallback(
    async (result?: { sessionId?: string }) => {
      const sessionId = result?.sessionId;
      if (!sessionId) {
        setError("Missing session information");
        return;
      }

      setIsLinkingCustomer(true);
      setError(null);

      try {
        // Call API to link customer ID to user account
        const response = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to link subscription to account"
          );
        }

        // Success - close sheet and refresh user data
        setClientSecret(null);
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        console.error("Failed to link customer:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to complete subscription setup"
        );
      } finally {
        setIsLinkingCustomer(false);
      }
    },
    [onOpenChange, onSuccess]
  );

  /**
   * Reset state when sheet closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setClientSecret(null);
        setError(null);
        setIsLinkingCustomer(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Lazy-load Stripe promise only when checkout is actually rendered
   * This prevents Stripe from initializing and making telemetry requests
   * until the user actually selects a tier and checkout is shown
   */
  const stripePromiseMemo = useMemo(() => {
    // Only load Stripe when we have a client secret (checkout is active)
    if (clientSecret && open) {
      return getStripePromise();
    }
    return null;
  }, [clientSecret, open]);

  /**
   * Render checkout content based on current state
   */
  const renderContent = () => {
    if (isLinkingCustomer) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="font-medium text-lg">
            Completing your subscription...
          </div>
          <div className="text-muted-foreground text-sm">
            Please wait while we set up your account
          </div>
        </div>
      );
    }

    if (error !== null) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="font-medium text-destructive text-lg">
            Setup Error
          </div>
          <div className="text-center text-muted-foreground text-sm">
            {error}
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
            onClick={() => {
              setError(null);
              setClientSecret(null);
            }}
            type="button"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (clientSecret && stripePromiseMemo) {
      return (
        <EmbeddedCheckoutProvider
          options={{
            clientSecret,
            onComplete: handleComplete as () => void,
          }}
          stripe={stripePromiseMemo}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      );
    }

    return (
      <PricingCards
        compact
        currentTier={currentTier}
        isLoading={isLoading}
        onManageSubscription={handleManageSubscription}
        onSelectTier={handleSelectTier}
      />
    );
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-6xl"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>
            {clientSecret ? "Complete your purchase" : "Choose your plan"}
          </SheetTitle>
          <SheetDescription>
            {clientSecret
              ? "Enter your payment details to subscribe"
              : "Select a plan that works for you"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 rounded-lg p-4">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
};
