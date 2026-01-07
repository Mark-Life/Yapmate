/**
 * Checkout session status handler
 * Retrieves session status and links Stripe customer ID to user
 */
import { updateStripeCustomerId } from "@yapmate/db/service";
import { stripe } from "../../../lib/stripe";

/**
 * Handles return from Stripe embedded checkout
 * Retrieves session, links customer to user, returns status
 */
export const checkoutSuccessHandler = {
  async GET(req: Request) {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return Response.json(
        { error: "Missing session_id parameter" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Validate session has required data
    const customerId = session.customer;
    const userId = session.client_reference_id;

    if (!customerId || typeof customerId !== "string") {
      return Response.json(
        { error: "Session missing customer ID" },
        { status: 400 }
      );
    }

    if (!userId) {
      return Response.json(
        { error: "Session missing client_reference_id" },
        { status: 400 }
      );
    }

    // Link Stripe customer to our user
    await updateStripeCustomerId(userId, customerId);

    return Response.json({
      status: session.status,
      customerEmail: session.customer_details?.email,
    });
  },
};
