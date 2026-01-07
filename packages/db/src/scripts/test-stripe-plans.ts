/**
 * Test script to verify Drizzle can query stripe schema without full introspection.
 * Run: bun --env-file ../../.env src/scripts/test-stripe-plans.ts
 */

import {
  bigint,
  boolean,
  jsonb,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Define stripe schema
const stripe = pgSchema("stripe");

// Define plans table inline (no sync needed)
const plans = stripe.table("plans", {
  id: text().primaryKey(),
  name: text(),
  active: boolean(),
  amount: bigint({ mode: "number" }),
  currency: text(),
  interval: text(),
  intervalCount: bigint("interval_count", { mode: "number" }),
  product: text(),
  nickname: text(),
  metadata: jsonb(),
  // Internal sync fields
  _updatedAt: timestamp("_updated_at", { withTimezone: true }),
  _rawData: jsonb("_raw_data"),
});

// Connect
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// Query and log
const result = await db.select().from(plans).limit(10);

console.log("Stripe Plans:");
console.log(JSON.stringify(result, null, 2));

// Cleanup
await client.end();
