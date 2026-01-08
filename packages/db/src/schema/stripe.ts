/**
 * Stripe Sync Engine tables - read-only, managed by Stripe Sync Engine
 *
 * IMPORTANT: NOT exported from schema.ts to prevent Drizzle from managing these tables.
 * Import directly from this file for type-safe queries:
 *   import { stripeSubscriptions } from "./schema/stripe";
 */
import { boolean, integer, jsonb, pgSchema, text } from "drizzle-orm/pg-core";

const stripe = pgSchema("stripe");

/** Stripe subscriptions - tracks active/inactive subscription status */
export const stripeSubscriptions = stripe.table("subscriptions", {
  id: text().primaryKey(),
  customer: text(),
  status: text(),
  /** Subscription items containing price/product info */
  items: jsonb(),
  /** Unix timestamp when current billing period started */
  currentPeriodStart: integer("current_period_start"),
  /** Unix timestamp when current billing period ends (renewal date) */
  currentPeriodEnd: integer("current_period_end"),
});

/** Stripe prices (formerly plans) - links products to pricing */
export const stripePrices = stripe.table("prices", {
  id: text().primaryKey(),
  /** References stripe.products.id */
  product: text(),
  active: boolean(),
});

/** Stripe products - maps to subscription tiers */
export const stripeProducts = stripe.table("products", {
  id: text().primaryKey(),
  name: text(),
  active: boolean(),
});
