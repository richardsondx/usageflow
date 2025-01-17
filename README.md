# UsageFlow (In Development)

A **lightweight Node.js package** for **usage tracking** and **limit enforcement** in SaaS applications. **UsageFlow** integrates seamlessly with the [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper) package by default, or you can build a **custom (manual) Stripe integration** if preferred.

> **Status:** Not production-ready yet. Early adopters welcome.

---

## Table of Contents

1. [Introduction](#introduction)  
2. [Common Use Cases](#common-use-cases)  
3. [Installation](#installation)  
4. [Quick Start](#quick-start)  
5. [How It Works](#how-it-works)  
6. [Supabase Schema](#supabase-schema)  
7. [Feature Limits & Usage Tracking](#feature-limits--usage-tracking)  
8. [Usage Adjustments & Resets](#usage-adjustments--resets)  
9. [Integrations](#integrations)  
10. [Testing Your Setup](#testing-your-setup)  
11. [License](#license)  
12. [Contributing](#contributing)  
13. [Author](#author)  

---

## Introduction

Building a SaaS application often requires tracking usage—whether for API calls, AI model tokens, or digital asset generation. **UsageFlow** provides:

- **Easy usage logging**: A straightforward way to track per-feature consumption.
- **Limit enforcement**: Check if a user is still within their plan quota.
- **Plan integration**: By default, uses `saas-subscription-helper` or you can implement a custom Stripe workflow.
- **Advanced features**: Includes user-specific limit adjustments, usage resets, usage audits, and more.

Focus on your core business logic without writing a custom usage tracking system from scratch.

## Common Use Cases

### 1. Tiered Feature Access
Perfect for managing multi-tier subscriptions:
- Basic: 100 exports/month
- Pro: 1000 exports/month
- Enterprise: Unlimited exports
```javascript
const canAccess = await usageFlow.authorize({
  userId: 'user-123',
  featureName: 'ai_chat_limit'
});
```
The package automatically determines the user's plan and feature access based on their subscription


### 2. Credit-Based SaaS Applications
Perfect for platforms offering credit-based services like:
- Design tools with export credits
- API gateways with request quotas
- File processing services with conversion limits
```javascript
await usageFlow.incrementUsage({
  userId: 'user-123',
  featureName: 'design-export',
  creditsUsed: 1
});
```

### 3. AI Service Wrappers
Ideal for applications managing AI model usage:
- Track token consumption across GPT models
- Monitor image generation credits
- Enforce rate limits per model type

```javascript
await usageFlow.incrementUsage({
  userId: 'user-123',
  featureName: 'gpt-4-completion',
  creditsUsed: response.usage.total_tokens,
  metadata: { model: 'gpt-4o-mini' }
});
```

## Installation

Install UsageFlow:
```bash
npm install usageflow
```

Install Required Peer Dependencies:
```bash
npm install @supabase/supabase-js stripe saas-subscription-helper
```

Verify Node.js version: 14 or higher.

## Quick Start

Initialize UsageFlow:
```javascript
const UsageFlow = require('usageflow');

const usageFlow = new UsageFlow({
  supabaseUrl: 'https://your-supabase-instance',
  supabaseKey: 'your-supabase-service-key',
});
```

Track Usage:
```javascript
await usageFlow.incrementUsage({
  userId: 'user-123',
  featureName: 'api-call',
  creditsUsed: 1
});
```

Fetch Usage:
```javascript
const usage = await usageFlow.fetchUsage({
  userId: 'user-123',
  featureName: 'api-call'
});
console.log(usage);
// => { current: 50, limit: 100, remaining: 50, isUnlimited: false }
```

Enforce Limits:
```javascript
const canAccess = await usageFlow.authorize({
  userId: 'user-123',
  featureName: 'api-call'
});
console.log(canAccess ? "Access granted" : "Limit exceeded. Upgrade required.");
```

## How It Works

**UsageFlow** simplifies usage tracking and limit enforcement in your SaaS application:

1. **Initialize**: Pass your Supabase configuration and optional settings
2. **Plan Configuration**: Define plans and their feature limits in the database
3. **Track Usage**: Log events as users consume features
4. **Enforce Limits**: Check if users are within their quotas
5. **Manage Adjustments**: Handle refunds, bonuses, or resets when needed

## Supabase Schema

### Table Configuration

You can customize table names during initialization:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  // Custom table names (optional)
  userPlansTable: 'custom_user_plans',
  usageEventsTable: 'custom_usage_events',
  usageFeatureLimitsTable: 'custom_feature_limits',
  userLimitAdjustmentsTable: 'custom_limit_adjustments'  // If enableUserAdjustments: true
});
```

Default table names if not specified:
- `user_plans` - Stores subscription plans
- `usage_events` - Records usage tracking events
- `usage_feature_limits` - Defines feature limits per plan
- `user_limit_adjustments` - Stores user-specific limit adjustments (if enabled)

### Required Tables

1. **`user_plans` Table**
```sql
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                    -- Plan name (e.g., "Basic Plan")
    stripe_price_id TEXT UNIQUE,           -- Stripe Price ID
    price_amount DECIMAL(10,2),            -- Price amount
    price_currency TEXT,                   -- Currency code
    is_free BOOLEAN DEFAULT FALSE,         -- Identifies free plans
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

2. **`usage_feature_limits` Table**
```sql
CREATE TABLE usage_feature_limits (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL REFERENCES user_plans(id),
    feature_name TEXT NOT NULL,           -- Feature identifier
    limit_value INT NOT NULL,             -- -1 for unlimited
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

3. **`usage_events` Table**
```sql
CREATE TABLE usage_events (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- User's unique identifier
    feature_name TEXT NOT NULL,           -- Feature being used
    credits_used INT,                     -- Number of credits (NULL for resets)
    event_type TEXT NOT NULL 
      CHECK (event_type IN ('usage', 'credit', 'reset', 'adjustment'))
      DEFAULT 'usage',
    metadata JSONB,                       -- Additional event data
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_usage_events_user_feature ON usage_events(user_id, feature_name);
CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
```

### Optional Tables

4. **`user_limit_adjustments` Table** (Required if `enableUserAdjustments: true`)
```sql
CREATE TABLE user_limit_adjustments (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- User's unique identifier
    feature_name TEXT NOT NULL,           -- Feature being adjusted
    amount INTEGER NOT NULL,              -- Adjustment amount (can be negative)
    type TEXT NOT NULL 
      CHECK (type IN ('one_time', 'recurring')),
    start_date TIMESTAMP NOT NULL,        -- When adjustment becomes active
    end_date TIMESTAMP NOT NULL,          -- When adjustment expires
    metadata JSONB,                       -- Optional context (reason, etc.)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_limit_adjustments_user ON user_limit_adjustments(user_id);
CREATE INDEX idx_limit_adjustments_dates ON user_limit_adjustments(start_date, end_date);
```

This table enables:
- One-time limit bonuses (e.g., promotional offers)
- Recurring limit adjustments (e.g., grandfathered plans)
- Temporary limit increases (e.g., seasonal boosts)
- Custom enterprise limits

## Feature Limits & Usage Tracking

### Track Usage

```javascript
// Regular usage tracking
await usageFlow.incrementUsage({
  userId: 'user-123',
  featureName: 'api-call',
  creditsUsed: 1,
  metadata: { type: 'standard_call' }
});

// Track with metadata
await usageFlow.incrementUsage({
  userId: 'user-123',
  featureName: 'ai_completion',
  creditsUsed: response.usage.total_tokens,
  metadata: { 
    model: 'gpt-4o-mini',
    prompt_tokens: response.usage.prompt_tokens,
    completion_tokens: response.usage.completion_tokens
  }
});
```

### Fetch Usage & Limits

```javascript
// Get current usage with limits
const usage = await usageFlow.fetchUsage({
  userId: 'user-123',
  featureName: 'api-call'
});
console.log(usage);
// {
//   current: 50,        // Total credits used
//   limit: 100,         // Maximum allowed
//   remaining: 50,      // Credits remaining
//   isUnlimited: false  // Whether feature has no limit
// }

// Get detailed usage stats
const stats = await usageFlow.getUsageStats({
  userId: 'user-123',
  featureName: 'api-call',
  period: 'current_month',
  groupBy: 'day'  // 'hour', 'day', 'week', 'month'
});
console.log(stats);
// {
//   total: 150,
//   average: 10,
//   max: 25,
//   min: 5,
//   byPeriod: [
//     { date: '2024-01-01', total: 25 },
//     { date: '2024-01-02', total: 15 }
//   ]
// }
```

### Available Period Options

When fetching usage data, you can specify these time periods:
- `current_month`: From start of current month
- `last_30_days`: Rolling 30-day window
- `last_28_days`: Rolling 28-day window
- `current_week`: From start of current week

## Usage Adjustments & Resets

### Enabling User Adjustments

To use limit adjustments and bonuses, you must:

1. Enable the feature in your configuration:
```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  enableUserAdjustments: true  // Required for adjustments
});
```

2. Create the `user_limit_adjustments` table in your database (see [Supabase Schema](#supabase-schema))

Enable this feature when you need to:
- Offer promotional bonuses
- Grant compensation credits
- Create custom enterprise limits
- Provide seasonal or temporary limit increases
- Handle grandfathered plan features

### Usage Adjustments

```javascript
// Refund or deduct credits
await usageFlow.adjustUsage({
  userId: 'user-123',
  featureName: 'api-call',
  amount: -5,  // Negative for refunds
  metadata: { reason: 'service_error' }
});

// Grant bonus credits
await usageFlow.adjustUsage({
  userId: 'user-123',
  featureName: 'api-call',
  amount: 10,  // Positive for bonuses
  metadata: { reason: 'loyalty_reward' }
});
```

### Reset Usage

```javascript
// Reset specific feature
await usageFlow.resetFeatureUsage({
  userId: 'user-123',
  featureName: 'ai_chat_limit'
});

// Get usage since last reset
const usage = await usageFlow.getUsageSinceReset({
  userId: 'user-123',
  featureName: 'ai_chat_limit'
});
console.log(usage);
// {
//   total: 50,
//   lastResetDate: '2024-01-01T00:00:00Z',
//   preResetTotal: 150
// }
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `supabaseUrl` | string | required | Your Supabase project URL |
| `supabaseKey` | string | required | Your Supabase service role key |
| `manualStripeIntegration` | boolean | `false` | Set to `true` if not using saas-subscription-helper |
| `enableUserAdjustments` | boolean | `false` | Enable user-specific limit adjustments and bonuses |
| `debug` | boolean | `false` | Enable detailed logging for debugging |
| `userPlansTable` | string | `'user_plans'` | Custom name for plans table |
| `usageEventsTable` | string | `'usage_events'` | Custom name for events table |
| `usageFeatureLimitsTable` | string | `'usage_feature_limits'` | Custom name for limits table |
| `userLimitAdjustmentsTable` | string | `'user_limit_adjustments'` | Custom name for adjustments table |


## Integrations

### Default: With saas-subscription-helper

This is the recommended integration method:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  // manualStripeIntegration: false (default)
});
```

- No extra configuration needed
- Plan and price syncing happen automatically
- Shared webhook endpoints handle all events

### Advanced: Manual Stripe Integration

For custom Stripe integrations:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  manualStripeIntegration: true,
});
```

Handle price updates in your webhook:
```javascript
// app/api/webhooks/route.js
import Stripe from 'stripe';

export async function POST(req) {
  try {
    const event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'price.updated') {
      await usageFlow.syncPrice(event.data.object);
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}
```

### Using Edge Functions

Deploy webhooks on Supabase Edge Functions:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    await usageFlow.handleWebhook({
      rawBody: await req.text(),
      signature: req.headers.get("stripe-signature")
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Required Webhook Events

| Event | Purpose | Required By |
|-------|----------|------------|
| `price.updated` | Syncs price changes | UsageFlow |
| `customer.subscription.updated` | Updates subscription status | saas-subscription-helper |
| Other subscription events | Manages subscription lifecycle | saas-subscription-helper |

## Testing Your Setup

### Test Connection

```javascript
try {
  const isConnected = await usageFlow.connectionCheck();
  console.log(isConnected ? "Connection successful" : "Connection failed");
} catch (error) {
  console.error("Connection check error:", error.message);
}
```

### Debug Mode

Enable detailed logging:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-url',
  supabaseKey: 'your-key',
  debug: true
});
```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Feel free to:
- Open issues
- Submit pull requests
- Suggest improvements
- Report bugs

## Author

Created by Richardson Dackam.  
Follow on Twitter: [@richardsondx](https://twitter.com/richardsondx)