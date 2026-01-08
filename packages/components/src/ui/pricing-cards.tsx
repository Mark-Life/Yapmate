/**
 * Pricing cards component - displays subscription tiers
 * Used in public about page and in-app upgrade flow
 */
import { cn } from "@yapmate/components/lib/utils";
import { CheckIcon } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

/** Subscription tier type */
export type PricingTier = "free" | "hobby" | "pro" | "unlimited";

/** Price IDs for Stripe checkout */
export const PRICE_IDS = {
  hobby: "price_1SmrE5JLiOxS066aZGavOt6S",
  pro: "price_1SmrzgJLiOxS066aW3Oyi4Tq",
} as const;

/** Tier configuration */
const TIERS: {
  id: PricingTier;
  name: string;
  price: string;
  priceDetail: string;
  messages: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceDetail: "forever",
    messages: "20 messages/month",
    features: ["All AI models", "Web & iOS apps", "Chat history sync"],
  },
  {
    id: "hobby",
    name: "Hobby",
    price: "$7",
    priceDetail: "/month",
    messages: "1,000 messages/month",
    features: [
      "All AI models",
      "Web & iOS apps",
      "Chat history sync",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$15",
    priceDetail: "/month",
    messages: "3,000 messages/month",
    features: [
      "All AI models",
      "Web & iOS apps",
      "Chat history sync",
      "Priority support",
    ],
  },
];

type PricingCardsProps = {
  /** Current user's tier (null for public/unauthenticated view) */
  currentTier?: PricingTier | null;
  /** Called when user selects a tier to upgrade */
  onSelectTier?: (priceId: string) => void;
  /** Loading state for upgrade action */
  isLoading?: boolean;
  /** Compact mode for smaller containers */
  compact?: boolean;
};

/**
 * Displays pricing tiers as cards
 * Highlights current tier and shows upgrade buttons
 */
export const PricingCards = ({
  currentTier = null,
  onSelectTier,
  isLoading = false,
  compact = false,
}: PricingCardsProps) => {
  /**
   * Get button text based on tier comparison
   */
  const getButtonText = (tierId: PricingTier): string => {
    if (!currentTier) return tierId === "free" ? "Get Started" : "Subscribe";
    if (tierId === currentTier) return "Current Plan";
    if (tierId === "free") return "Free Tier";

    // Compare tier levels
    const tierOrder: PricingTier[] = ["free", "hobby", "pro", "unlimited"];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(tierId);

    return targetIndex > currentIndex ? "Upgrade" : "Downgrade";
  };

  /**
   * Check if button should be disabled
   */
  const isButtonDisabled = (tierId: PricingTier): boolean => {
    if (isLoading) return true;
    if (!currentTier) return false;
    // Can't select current tier or downgrade to free
    return tierId === currentTier || tierId === "free";
  };

  /**
   * Handle tier selection
   */
  const handleSelect = (tierId: PricingTier) => {
    if (tierId === "free" || !onSelectTier) return;
    const priceId = PRICE_IDS[tierId as keyof typeof PRICE_IDS];
    if (priceId) onSelectTier(priceId);
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        compact
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-1 md:grid-cols-3"
      )}
    >
      {TIERS.map((tier) => {
        const isCurrent = tier.id === currentTier;
        const isPopular = tier.popular && !currentTier;

        return (
          <Card
            className={cn(
              "relative",
              isCurrent && "border-primary ring-1 ring-primary",
              isPopular && !isCurrent && "border-primary/50"
            )}
            key={tier.id}
          >
            {/* Popular badge */}
            {isPopular && !isCurrent && (
              <div className="-top-3 absolute right-4">
                <Badge>Popular</Badge>
              </div>
            )}

            {/* Current badge */}
            {isCurrent && (
              <div className="-top-3 absolute right-4">
                <Badge variant="secondary">Current</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className={compact ? "text-lg" : "text-xl"}>
                {tier.name}
              </CardTitle>
              <CardDescription className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "font-bold text-foreground",
                    compact ? "text-2xl" : "text-3xl"
                  )}
                >
                  {tier.price}
                </span>
                <span className="text-muted-foreground">{tier.priceDetail}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <p
                className={cn(
                  "mb-4 font-medium text-primary",
                  compact ? "text-sm" : "text-base"
                )}
              >
                {tier.messages}
              </p>
              <ul className="space-y-2">
                {tier.features.map((feature) => (
                  <li
                    className="flex items-center gap-2 text-muted-foreground text-sm"
                    key={feature}
                  >
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                disabled={isButtonDisabled(tier.id)}
                onClick={() => handleSelect(tier.id)}
                variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
              >
                {getButtonText(tier.id)}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
