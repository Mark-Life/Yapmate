/**
 * Subscription router - subscription and usage operations
 */
import { ORPCError } from "@orpc/server";
import {
  checkGenerationLimit,
  getStripeCustomerId,
  getUserResetDate,
} from "@yapmate/db/service";
import { stripe } from "@yapmate/server/lib/stripe";
import { protectedProcedure } from "../middleware";
import {
  portalSessionResponseSchema,
  usageResponseSchema,
} from "../schemas/subscription";

/**
 * Subscription router - usage and subscription management
 */
export const subscription = {
  /**
   * Get current user's subscription usage
   * Returns tier, generation count, limit, and reset date
   */
  usage: protectedProcedure
    .output(usageResponseSchema)
    .handler(async ({ context }) => {
      const result = await checkGenerationLimit(context.userId);
      const resetsAt = await getUserResetDate(context.userId);
      return {
        ...result,
        // Convert Infinity to null for JSON serialization
        limit: Number.isFinite(result.limit) ? result.limit : null,
        resetsAt,
      };
    }),

  /**
   * Creates a Stripe Customer Portal session
   * Returns a URL to redirect the user to manage their subscription
   */
  createPortalSession: protectedProcedure
    .output(portalSessionResponseSchema)
    .handler(async ({ context }) => {
      const stripeCustomerId = await getStripeCustomerId(context.userId);

      if (!stripeCustomerId) {
        throw new ORPCError("NOT_FOUND", {
          message:
            "No Stripe customer ID found. Please create a subscription first.",
        });
      }

      // Get origin for return URL
      const origin = new URL(context.req.url).origin;

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/`,
      });

      return { url: session.url };
    }),
};
