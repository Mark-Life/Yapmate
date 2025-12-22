Let me analyze your existing schema to understand the current structure and then propose a solution for the subscription system.

[6 tools called]

Now I have a complete picture. Let me analyze and propose a comprehensive solution.

---

## Analysis

### Current State

- **`users`**: Basic user info, no subscription data
- **`usage_records`**: Tracks all usage (chat, title, transcription, agent) with model, tokens, cost
- Usage is saved after each `chat` message in `executeStream()`
- Good indexes already exist

### Requirements Summary

1. Monthly subscription with fixed price
2. Two usage buckets: standard models (~1500/mo) & premium models (~200/mo)
3. Manual override for unlimited users (you, teammates)
4. Future: credit purchases, super tier

---

## Proposed Schema Design

### 1. **`subscriptions`** table — Polar subscription state

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Polar identifiers
  polar_subscription_id TEXT UNIQUE,  -- null for manual/free
  polar_customer_id TEXT,

  -- Plan info
  plan TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'super' | 'unlimited'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due' | 'trialing'

  -- Billing period (for usage reset)
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,

  -- Flags
  cancel_at_period_end BOOLEAN DEFAULT false,
  is_manual BOOLEAN DEFAULT false,  -- true for manually granted (you, teammates)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
```

### 2. **`usage_counters`** table — Fast usage checks (denormalized)

```sql
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Period this counter is for
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Message counts (not tokens, not cost—just message count)
  standard_model_count INTEGER NOT NULL DEFAULT 0,
  premium_model_count INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, period_start)
);

CREATE INDEX usage_counters_user_period_idx ON usage_counters(user_id, period_start);
```

### 3. **`premium_models`** config — Model tier classification

You can do this as:

- **A table** (more flexible, can update without deploy)
- **A config file** (simpler, faster reads)

I'd recommend a **config/constants file** with a `Set<string>` of premium model IDs, since this rarely changes and needs to be super fast:

```typescript
// src/server/lib/models/tiers.ts
export const PREMIUM_MODELS = new Set([
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3-opus",
  "openai/gpt-4o",
  "openai/o1",
  "google/gemini-pro-1.5",
  // ... add more
]);

export const isPremiumModel = (modelId: string): boolean =>
  PREMIUM_MODELS.has(modelId.replace(":online", ""));
```

### 4. **Plan limits config**

```typescript
// src/server/lib/subscription/limits.ts
export const PLAN_LIMITS = {
  free: { standard: 50, premium: 5 },
  pro: { standard: 1500, premium: 200 },
  super: { standard: 5000, premium: 1000 },
  unlimited: { standard: Infinity, premium: Infinity },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
```

---

## Performance Strategy

**Problem**: Checking usage on every message must be fast.

**Solution**: Redis counter + DB persistence hybrid

```
┌─────────────────────────────────────────────────────────┐
│                    Message Request                       │
├─────────────────────────────────────────────────────────┤
│ 1. Check subscription (cached in Redis, ~5min TTL)      │
│    ↓                                                     │
│ 2. If plan = "unlimited" → skip check, allow            │
│    ↓                                                     │
│ 3. Read Redis counter: user:{userId}:usage:{period}     │
│    Keys: "standard" and "premium"                       │
│    ↓                                                     │
│ 4. Compare against PLAN_LIMITS[plan]                    │
│    ↓                                                     │
│ 5. If over limit → 429 error with upgrade prompt        │
│    If OK → proceed with stream                          │
│    ↓                                                     │
│ 6. After stream completes:                              │
│    - INCR Redis counter                                  │
│    - Save usage_record (existing behavior)              │
│    - Background: sync to usage_counters table           │
└─────────────────────────────────────────────────────────┘
```

### Redis Keys Structure:

```
subscription:{userId}           → cached subscription object (TTL: 5min)
usage:{userId}:{periodStart}:standard  → integer count
usage:{userId}:{periodStart}:premium   → integer count
```

---

## Flow: How Usage Check Works

```typescript
// src/server/lib/subscription/check-usage.ts

type UsageCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "limit_exceeded";
      tier: "standard" | "premium";
      used: number;
      limit: number;
    };

export const checkUsageAllowed = async (
  userId: string,
  modelId: string
): Promise<UsageCheckResult> => {
  // 1. Get subscription (from Redis cache or DB)
  const subscription = await getSubscription(userId);

  // 2. Unlimited users bypass all checks
  if (subscription.plan === "unlimited") {
    return { allowed: true };
  }

  // 3. Determine model tier
  const tier = isPremiumModel(modelId) ? "premium" : "standard";

  // 4. Get current period and usage from Redis
  const periodKey = formatPeriodKey(subscription.currentPeriodStart);
  const used = (await redis.get(`usage:${userId}:${periodKey}:${tier}`)) ?? 0;

  // 5. Get limit for this plan
  const limit = PLAN_LIMITS[subscription.plan][tier];

  // 6. Check
  if (used >= limit) {
    return { allowed: false, reason: "limit_exceeded", tier, used, limit };
  }

  return { allowed: true };
};
```

---

## Integration Point

In your existing `handler.ts` before calling `executeStream()`:

```typescript
// Before streaming
const usageCheck = await checkUsageAllowed(userId, model);
if (!usageCheck.allowed) {
  return new Response(
    JSON.stringify({
      error: "usage_limit_exceeded",
      tier: usageCheck.tier,
      used: usageCheck.used,
      limit: usageCheck.limit,
      message: `You've used ${usageCheck.used}/${usageCheck.limit} ${usageCheck.tier} messages this month`,
    }),
    { status: 429 }
  );
}

// After stream completes (in executeStream or handleStreamFinish)
await incrementUsageCounter(userId, model, subscription.currentPeriodStart);
```

---

## Polar Integration

### Webhook Handler

Polar sends webhooks for subscription events. You'll need:

```typescript
// src/server/routes/api/webhooks/polar.ts
export const polarWebhook = async (req: Request) => {
  const event = await validatePolarWebhook(req);

  switch (event.type) {
    case "subscription.created":
    case "subscription.updated":
      await upsertSubscription({
        userId: event.data.metadata.userId, // You pass this at checkout
        polarSubscriptionId: event.data.id,
        polarCustomerId: event.data.customer_id,
        plan: mapPolarProductToPlan(event.data.product_id),
        status: event.data.status,
        currentPeriodStart: new Date(event.data.current_period_start),
        currentPeriodEnd: new Date(event.data.current_period_end),
      });
      // Invalidate Redis cache
      await redis.del(`subscription:${userId}`);
      break;

    case "subscription.canceled":
      await updateSubscriptionStatus(event.data.id, "canceled");
      break;
  }
};
```

### Checkout Flow

```typescript
// Client initiates checkout
const checkoutUrl = await polar.checkouts.create({
  productId: "your-pro-plan-product-id",
  successUrl: "https://yourapp.com/settings?checkout=success",
  metadata: { userId: currentUser.id }, // Critical: pass userId for webhook
});
```

---

## Manual Unlimited Users

Create a simple admin function or use direct DB:

```typescript
// src/server/lib/subscription/admin.ts
export const grantUnlimitedAccess = async (userId: string) => {
  await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "unlimited",
      status: "active",
      isManual: true,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null, // Never expires
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { plan: "unlimited", isManual: true, status: "active" },
    });

  await redis.del(`subscription:${userId}`);
};
```

---

## Future: Credit Purchases

When ready, add a `credits` table:

```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standard_credits INTEGER DEFAULT 0,
  premium_credits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Then modify `checkUsageAllowed()` to:

1. First check subscription limits
2. If exceeded, check if user has credits
3. Deduct from credits if available

---

## Summary: New Files/Tables Needed

| Type    | Name                                         | Purpose                              |
| ------- | -------------------------------------------- | ------------------------------------ |
| Table   | `subscriptions`                              | Polar subscription state             |
| Table   | `usage_counters`                             | Denormalized usage counts per period |
| Config  | `src/server/lib/models/tiers.ts`             | Premium model list                   |
| Config  | `src/server/lib/subscription/limits.ts`      | Plan limits                          |
| Service | `src/server/lib/subscription/check-usage.ts` | Usage check logic                    |
| Service | `src/server/lib/subscription/service.ts`     | Subscription CRUD                    |
| Route   | `src/server/routes/api/webhooks/polar.ts`    | Polar webhook handler                |
| Route   | `src/server/routes/api/checkout.ts`          | Create checkout session              |

---

## Questions

1. **Redis**: You already have Redis set up (`src/server/lib/redis/`). Should I use that same client for counters?

2. **Billing period**: Monthly from signup date, or calendar month (1st of each month)?

3. **Free tier**: Should there be a free tier with limited usage, or is free = no access until they subscribe?

4. **Grace period**: If subscription lapses, immediate cutoff or grace period?

5. **Usage types to count**: Only `type: "chat"` counts toward limits, correct? (title, transcription don't count)
