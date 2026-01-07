/**
 * Stripe Checkout API handler
 * Creates embedded checkout sessions for subscription purchases
 */
import { stripe } from "../../../lib/stripe";
import { getCurrentUserId } from "../../../lib/supabase";

/** Valid price IDs for subscription products */
const VALID_PRICE_IDS = new Set([
  "price_1SmrE5JLiOxS066aZGavOt6S", // Hobby - $7/mo
  "price_1SmrzgJLiOxS066aW3Oyi4Tq", // Pro - $15/mo
]);

/**
 * Creates an embedded Stripe Checkout session for subscription
 */
export const checkoutHandler = {
  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { priceId }: { priceId: string } = await req.json();

    if (!VALID_PRICE_IDS.has(priceId)) {
      return Response.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get origin for return URL
    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Links Stripe Customer to our user after checkout
      client_reference_id: userId,
      // Stripe redirects here after payment (success or cancel)
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return Response.json({ clientSecret: session.client_secret });
  },
};
