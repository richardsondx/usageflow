# UsageFlow (In Development)

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png" height="40" alt="Stripe" />
  <span style="margin: 0 10px;">+</span>
  <img src="https://revolugame.com/p/setup-supabase-locally-with-docker/supabase-logo-wordmark--dark.png" height="40" alt="Supabase" />
</p>


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
> **Note**: This package is currently in development and not yet published to npm. Stay tuned for the initial release!


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

## How It Works

**UsageFlow** simplifies usage tracking and limit enforcement in your SaaS application:

1. **Initialize**: Pass your Supabase configuration and optional settings
2. **Plan Configuration**: Define plans and their feature limits in the database
3. **Track Usage**: Log events as users consume features
4. **Enforce Limits**: Check if users are within their quotas
5. **Manage Adjustments**: Handle refunds, bonuses, or resets when needed

## Supabase Schema

> **Security Tip:** Enable Row Level Security (RLS) on all tables to protect user data.

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

### Price & Plan Management

1. **Free Plans**:
   - Set `is_free = TRUE`
   - Leave `stripe_price_id` as NULL
   - Example: Community or Basic tier

2. **Paid Plans**:
   - Set `is_free = FALSE`
   - Provide valid `stripe_price_id` from Stripe
   - Example: Pro or Enterprise tiers

3. **Price Syncing**:
   - **Initial Setup**: 
     - First-time plan and price setup must be done manually in your database
     - Insert records into `user_plans` table for each subscription tier
     - Define feature limits in `usage_feature_limits` table
   - **Automatic** (with saas-subscription-helper):
     - Price changes in Stripe automatically sync via webhooks
     - No additional configuration needed
   - **Manual** (if `manualStripeIntegration: true`):
     - Handle price syncing in your own webhook
     - Implement your own price update logic

**Note:** For display purposes, prices are stored in the database, but actual billing always uses live Stripe prices. This ensures accurate billing while providing fast price display in your application.

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

### Required Webhook Events

| Event | Purpose | Required By |
|-------|----------|------------|
| `price.updated` | Syncs price changes | UsageFlow |
| `customer.subscription.updated` | Updates subscription status | saas-subscription-helper |
| Other subscription events | Manages subscription lifecycle | saas-subscription-helper |

### Setting Up Webhooks

1. **Create Webhook Endpoint**:
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
    
    // UsageFlow needs the price.updated webhook to keep its internal price records 
    // in sync with Stripe. When you update prices in Stripe (e.g. changing tiers, 
    // limits or costs), this webhook ensures UsageFlow's usage tracking and limit 
    // enforcement stays accurate with the latest pricing configuration.
    if (event.type === 'price.updated') {
      // UsageFlow automatically updates the price_amount and price_currency fields
      await usageFlow.syncPrice(event.data.object);
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}
```

2. **Test locally using Stripe CLI**:
```bash
# Install Stripe CLI if you haven't already
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local endpoint
stripe listen --forward-to localhost:3000/api/webhooks
```

3. **Configure Stripe Webhook Settings**:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint URL: https://your-domain.com/api/webhooks
   - Select events to listen for:
     - price.updated (for UsageFlow price syncing)
     - customer.subscription.updated (for subscription management)
     - Other events required by saas-subscription-helper

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

## API Reference

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `incrementUsage` | Track feature usage for a user | - `userId` (string): User identifier<br>- `featureName` (string): Feature being used<br>- `creditsUsed` (number): Amount of credits to consume<br>- `metadata` (object, optional): Additional context | Promise<void> |
| `adjustUsage` | Adjust usage (refunds/bonuses) | - `userId` (string): User identifier<br>- `featureName` (string): Feature to adjust<br>- `amount` (number): Credits to add/remove<br>- `metadata` (object): Must include `reason` | Promise<void> |
| `authorize` | Check if user can access feature | - `userId` (string): User identifier<br>- `featureName` (string): Feature to check | Promise<boolean> |
| `fetchUsage` | Get usage details with limits | - `userId` (string): User identifier<br>- `featureName` (string): Feature to check<br>- `period` (string, optional): Time period | Promise<{<br>&nbsp;&nbsp;current: number,<br>&nbsp;&nbsp;limit: number,<br>&nbsp;&nbsp;remaining: number,<br>&nbsp;&nbsp;isUnlimited: boolean<br>}> |
| `getTotalUsage` | Get raw usage total | - `userId` (string): User identifier<br>- `featureName` (string): Feature to check<br>- `period` (string, optional): Time period | Promise<number> |
| `getUsageStats` | Get detailed usage statistics | - `userId` (string): User identifier<br>- `featureName` (string): Feature to analyze<br>- `period` (string, optional): Time period<br>- `groupBy` (string, optional): Grouping interval | Promise<{<br>&nbsp;&nbsp;total: number,<br>&nbsp;&nbsp;average: number,<br>&nbsp;&nbsp;max: number,<br>&nbsp;&nbsp;min: number,<br>&nbsp;&nbsp;byPeriod: Array<{<br>&nbsp;&nbsp;&nbsp;&nbsp;date: string,<br>&nbsp;&nbsp;&nbsp;&nbsp;total: number<br>&nbsp;&nbsp;}>}<br>}> |
| `getBatchUsageStats` | Get stats for multiple users/features | - `userIds` (string[]): User identifiers<br>- `featureNames` (string[]): Features to analyze<br>- `period` (string, optional): Time period | Promise<Record<string, Record<string, UsageStats>>> |
| `fetchFeatureLimit` | Get feature limit for a plan | - `planId` (number): Plan identifier<br>- `featureName` (string): Feature to check | Promise<number \| null> |
| `fetchFeatureLimitForUser` | Get user's current feature limit | - `userId` (string): User identifier<br>- `featureName` (string): Feature to check | Promise<number \| null> |
| `addLimitAdjustment` | Add temporary/permanent limit adjustment | - `userId` (string): User identifier<br>- `featureName` (string): Feature to adjust<br>- `amount` (number): Adjustment amount<br>- `type` ('one_time' \| 'recurring'): Adjustment type<br>- `startDate` (Date): When adjustment starts<br>- `endDate` (Date): When adjustment ends | Promise<void> |
| `connectionCheck` | Test database connectivity | None | Promise<boolean> |

### Period Options

The `period` parameter accepts these values:
- `'current_month'` (default)
- `'last_30_days'`
- `'last_28_days'`
- `'current_week'`

### GroupBy Options

The `groupBy` parameter accepts:
- `'hour'`
- `'day'` (default)
- `'week'`
- `'month'`

### Metadata Structure

The `metadata` object can include any JSON-serializable data. Common fields:
- `model`: For AI-related features
- `reason`: Required for adjustments
- `type`: For categorizing usage

## Error Handling

UsageFlow uses standardized error codes to help you handle errors consistently. Each method throws specific error types:

### Error Types By Method

| Method | Possible Error Codes | Common Scenarios |
|--------|---------------------|------------------|
| `incrementUsage` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_CONFIG_ERROR` | - Missing/invalid userId (must be database ID)<br>- Missing featureName<br>- Database insert failure |
| `adjustUsage` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_CONFIG_ERROR`<br>- `USAGE_ADJUSTMENT_ERROR` | - Missing required fields<br>- Missing adjustment reason<br>- Invalid adjustment amount |
| `authorize` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_LIMIT_ERROR`<br>- `USAGE_CONFIG_ERROR` | - User not found<br>- No plan assigned<br>- Failed to fetch limits |
| `fetchUsage` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_LIMIT_ERROR`<br>- `USAGE_CONFIG_ERROR` | - Invalid user/feature<br>- Failed to fetch current usage<br>- Failed to fetch limits |
| `fetchFeatureLimitForUser` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_CONFIG_ERROR`<br>- `USAGE_LIMIT_ERROR`<br>- `USAGE_ADJUSTMENT_ERROR` | - User not found<br>- No plan assigned<br>- Failed to apply adjustments |
| `addLimitAdjustment` | - `USAGE_INVALID_PARAMS`<br>- `USAGE_ADJUSTMENT_ERROR` | - Invalid adjustment period<br>- Adjustments not enabled |

### Best Practices

1. **Always check error codes**:
```typescript
try {
  await usageFlow.incrementUsage(params);
} catch (error) {
  if (error instanceof UsageFlowError) {
    switch (error.code) {
      case ErrorCodes.USAGE_INVALID_PARAMS:
        // Handle validation errors
        break;
      case ErrorCodes.USAGE_CONFIG_ERROR:
        // Handle database/config issues
        break;
      // ... handle other codes
    }
  }
}
```

2. **Use error details**:
```typescript
catch (error) {
  if (error instanceof UsageFlowError) {
    console.error(`${error.code}: ${error.message}`);
    console.error('Details:', error.details);
    // details includes contextual information
  }
}
```

3. **Log database errors**:
```typescript
catch (error) {
  if (error.code === 'USAGE_CONFIG_ERROR') {
    console.error(
      'Database operation failed:', 
      error.details.originalError,
      'Table:', error.details.table
    );
  }
}
```

## Debug Mode

Enable detailed logging:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-url',
  supabaseKey: 'your-key',
  debug: true
});
```

## TODO

The following test coverage improvements are planned:

- Add comprehensive unit test suite
- Add test coverage reporting

The goal is to achieve >80% test coverage across all core functionality to ensure reliability and catch potential issues early.


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