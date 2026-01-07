# Subscriptions Plan

## Current State

- 20 messages/month free, then server returns 402
- Stripe Sync Engine active → `stripe.*` tables populated
- Two products created: $7/month and $15/month

### Current Implementation

Rate limiting logic lives in `packages/db/src/service/rate-limit.ts`:

```ts
// Priority order:
// 1. Check unlimitedAccessGrantedAt (admin/beta override) → skip limit
// 2. Count user messages this month
// 3. Compare against MESSAGE_LIMIT_PER_MONTH (20)

checkMessageLimit(userId) → { allowed, count, limit }
```

Called from `packages/server/src/routes/api/chat/handler.ts` before processing any chat request.

**Important**: `users.unlimitedAccessGrantedAt` field must be respected in new implementation (for admin/beta testers).

## Goal

Check user subscription status on each request. Allow more messages for paid users. Avoid split-brain by not duplicating subscription data.

---

## Architecture Overview

```
User Request → JOIN users + stripe tables → Get active subscription → Derive tier → Count usage → Allow/Deny
```

**Key principle**: Don't cache subscription status on `users` table. Query stripe tables (local, synced by Sync Engine) on each request. Single source of truth.

---

## Step-by-Step Implementation

### 1. Add stripeCustomerId to `users` table ✅

```ts
// users.ts
/** Stripe Customer ID (e.g., cus_xxx) - no FK, stripe schema is external */
stripeCustomerId: text(),
```

No FK reference - stripe schema is managed by Stripe Sync Engine, not Drizzle.

### 2. Stripe Table Definitions (Query-Only) ✅

Stripe tables are defined in `packages/db/src/schema/stripe.ts` but **NOT exported from `schema.ts`**.

This allows:

- Type-safe queries with Drizzle
- No migration conflicts (Drizzle doesn't try to CREATE tables)

```ts
// Import directly when needed (not from schema barrel)
import { stripeSubscriptions, stripePrices, stripeProducts } from "./schema/stripe";

// Query works fine
const subs = await db.select().from(stripeSubscriptions).where(...);
```

### 3. Create Stripe Checkout Session

When user clicks "Upgrade":

1. Create Checkout Session via Stripe API with `client_reference_id: userId`
2. Set success URL: `/checkout/success?session_id={CHECKOUT_SESSION_ID}`
3. Redirect user to Stripe Checkout

### 4. Handle Return URL

On `/checkout/success`:

1. Extract `session_id` from URL
2. Call Stripe API: `stripe.checkout.sessions.retrieve(session_id)`
3. Get `customer` ID from session
4. Update `users.stripeCustomerId` for the user (`client_reference_id`)

```ts
// Pseudo-code
const session = await stripe.checkout.sessions.retrieve(sessionId);
await db
  .update(users)
  .set({ stripeCustomerId: session.customer })
  .where(eq(users.id, session.client_reference_id));
```

### 5. Map Products to Tiers

Hardcode product ID → tier mapping:

```ts
const PRODUCT_TIER_MAP: Record<string, "hobby" | "pro"> = {
  prod_TkLv4EDEgXEUg2: "hobby", // $7
  prod_TkMjaoy0j7h6GN: "pro", // $15
};

const TIER_LIMITS: Record<string, number> = {
  free: 20,
  hobby: 1000,
  pro: 3000,
};
```

### 6. Update Rate Limit Check (JOIN Query)

Update `checkMessageLimit` in `rate-limit.ts` to query stripe tables:

```ts
// Import stripe tables directly (not from schema barrel)
import {
  stripeSubscriptions,
  stripePrices,
  stripeProducts,
} from "../schema/stripe";

// 1. Check unlimited access first (existing logic)
const unlimited = await hasUnlimitedAccess(userId);
if (unlimited) {
  return { allowed: true, count: 0, limit: Infinity, tier: "unlimited" };
}

// 2. Query stripe tables for active subscription
const result = await db
  .select({
    unlimitedAccessGrantedAt: users.unlimitedAccessGrantedAt,
    stripeCustomerId: users.stripeCustomerId,
    productId: stripeProducts.id,
  })
  .from(users)
  .leftJoin(
    stripeSubscriptions,
    and(
      eq(stripeSubscriptions.customer, users.stripeCustomerId),
      eq(stripeSubscriptions.status, "active")
    )
  )
  .leftJoin(stripePrices, eq(stripePrices.id, stripeSubscriptions.defaultPrice))
  .leftJoin(stripeProducts, eq(stripeProducts.id, stripePrices.product))
  .where(eq(users.id, userId))
  .limit(1);

// 3. Derive tier from product
const tier = result[0]?.productId
  ? PRODUCT_TIER_MAP[result[0].productId] ?? "free"
  : "free";

// 4. Get limit and count
const limit = TIER_LIMITS[tier];
const count = await getUserMonthlyMessageCount(userId);

return { allowed: count < limit, count, limit, tier };
```

---

## Message Limits (Draft)

| Tier  | Price  | Messages/Month |
| ----- | ------ | -------------- |
| Free  | $0     | 20             |
| Hobby | $7/mo  | 1000           |
| Pro   | $15/mo | 3000           |

Adjust based on actual usage data after launch.

---

## Stripe Tables Used

| Table                  | Purpose                               |
| ---------------------- | ------------------------------------- |
| `stripe.subscriptions` | Check if user has active subscription |
| `stripe.prices`        | Get product from price                |
| `stripe.products`      | Map to tier                           |

Note: Tables defined in `packages/db/src/schema/stripe.ts` for type-safe queries, but NOT exported to `schema.ts` to avoid Drizzle migration conflicts.

---

## Implementation Order

1. [x] Add `stripeCustomerId` field to `users` table
2. [x] Define stripe table schemas inline for Drizzle (not exported from schema.ts)
3. [ ] Update `checkMessageLimit` in `rate-limit.ts` with JOIN query
4. [ ] Create Checkout Session endpoint
5. [ ] Create return URL handler to link customer ID
6. [ ] Add "Upgrade" button in UI

---

## Future Scope

### Periodic Customer Reconciliation

Handle edge cases where `stripeCustomerId` is not set:

- Run periodic job (daily/hourly)
- Query `stripe.customers` by email
- Find users in `public.users` with matching email but no `stripeCustomerId`
- Auto-link them

This catches:

- Users who closed tab before return URL
- Manual customer creation in Stripe Dashboard
- Migration from other systems

---

## Files to Modify

| File                                    | Change                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/db/src/schema/users.ts`       | Add `stripeCustomerId` field ✅                                                                    |
| `packages/db/src/schema/stripe.ts`      | Define stripe tables (query-only, not in schema.ts) ✅                                             |
| `packages/db/src/service/rate-limit.ts` | Update `checkMessageLimit` to query stripe tables, derive tier, respect `unlimitedAccessGrantedAt` |
| `packages/server/src/routes/`           | Add checkout session + return URL endpoints                                                        |
| `apps/web/src/`                         | Upgrade button UI                                                                                  |
| `apps/mobile/src/`                      | Upgrade button UI                                                                                  |

### rate-limit.ts Changes

New logic flow:

```ts
checkMessageLimit(userId) {
  // 1. Check unlimitedAccessGrantedAt → unlimited (keep existing)
  // 2. Query stripe tables for active subscription → derive tier
  // 3. Get limit from TIER_LIMITS[tier]
  // 4. Count messages this month
  // 5. Return { allowed, count, limit, tier }
}
```
