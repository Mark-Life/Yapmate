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
import { useCallback, useState } from "react";

/** Stripe publishable key from environment */
const stripePromise = loadStripe(
  process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

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

  /**
   * Creates checkout session and gets client secret
   */
  const handleSelectTier = useCallback(async (priceId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle checkout completion
   */
  const handleComplete = useCallback(() => {
    setClientSecret(null);
    onOpenChange(false);
    onSuccess?.();
  }, [onOpenChange, onSuccess]);

  /**
   * Reset state when sheet closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setClientSecret(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-2xl"
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

        <div className="flex-1 p-4">
          {clientSecret ? (
            <EmbeddedCheckoutProvider
              options={{ clientSecret, onComplete: handleComplete }}
              stripe={stripePromise}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <PricingCards
              compact
              currentTier={currentTier}
              isLoading={isLoading}
              onSelectTier={handleSelectTier}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
