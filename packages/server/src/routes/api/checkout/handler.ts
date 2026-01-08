/**
 * Stripe Checkout API handler
 * Creates embedded checkout sessions for subscription purchases
 */
import { stripe } from "../../../lib/stripe";
import { getCurrentUser } from "../../../lib/supabase";

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
    const user = await getCurrentUser(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      priceId,
      colors,
    }: {
      priceId: string;
      colors?: { primary: string; background: string };
    } = await req.json();

    if (!VALID_PRICE_IDS.has(priceId)) {
      return Response.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get origin for return URL
    const origin = new URL(req.url).origin;

    // Build branding settings if colors are provided
    // Note: Stripe Checkout Sessions have limited customization compared to Stripe Connect/Elements
    // Only these properties are supported: display_name, font_family, border_style, background_color, button_color
    // For more customization (like text colors, borders, etc.), consider using Stripe Elements instead
    const brandingSettings = colors
      ? {
          display_name: "Yapmate",
          font_family: "roboto" as const,
          border_style: "rounded" as const,
          background_color: colors.background,
          button_color: colors.primary,
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Links Stripe Customer to our user after checkout
      client_reference_id: user.id,
      // Prefill email to ensure account sync (only if available)
      ...(user.email && { customer_email: user.email }),
      // Stripe redirects here after payment (success or cancel)
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      tax_id_collection: { enabled: true },
      ...(brandingSettings && { branding_settings: brandingSettings }),
      consent_collection: {
        terms_of_service: "required",
      },
    });

    return Response.json({ clientSecret: session.client_secret });
  },
};
