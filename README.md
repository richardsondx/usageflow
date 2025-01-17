# UsageFlow (in development)

**A lightweight Node.js package for usage tracking and limit enforcement in SaaS applications.**

⚠️ Not production ready yet.

UsageFlow integrates seamlessly with [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper) to manage subscriptions or works with manual Stripe setups for custom implementations. This flexibility makes it ideal for SaaS developers looking to add usage-based controls to their apps.

# UsageFlow

**A lightweight Node.js package for usage tracking and limit enforcement in SaaS applications.**

UsageFlow integrates seamlessly with [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper) to manage subscriptions or works with manual Stripe setups for custom implementations. This flexibility makes it ideal for SaaS developers looking to add usage-based controls to their apps.

## Common Use Cases

### 1. Tiered Feature Access
Perfect for managing multi-tier subscriptions:
- Basic: 100 exports/month
- Pro: 1000 exports/month
- Enterprise: Unlimited exports
```javascript
const canAccess = await usageFlow.authorize({
  userId: 'user-123',
  feature_name: 'ai_chat_limit',
  planTier: 'pro'
});
```

### 2. Credit-Based SaaS Applications
Perfect for platforms offering credit-based services like:
- Apps with credits limits
- API gateways with request quotas
- File processing services with conversion limits
```javascript
await usageFlow.trackEvent({
  userId: 'user-123',
  feature_name: 'image-enhancement',
  creditsUsed: 1
});
```

### 3. AI Service Wrappers
Ideal for applications managing AI model usage:
- Track token consumption across GPT models
- Monitor image generation credits
- Enforce rate limits per model type
```javascript
await usageFlow.trackEvent({
  userId: 'user-123',
  feature_name: 'ai_chat_limit',
  creditsUsed: response.usage.total_tokens,
  metadata: { model: 'gpt-4o-mini' }
});
```

---

## How it Works

**UsageFlow** simplifies the process of managing and enforcing usage limits in your SaaS application. Whether you're using a subscription management solution like `saas-subscription-helper` or a custom Stripe integration, integrating UsageFlow is as simple as following these steps:

1. **Initialize the Package**:  
   Pass your Supabase configuration and other optional settings (e.g., custom table names or manual Stripe integration) during initialization.

   ```javascript
   const UsageFlow = require('usageflow');

   const usageFlow = new UsageFlow({
     supabaseUrl: 'https://your-supabase-instance',
     supabaseKey: 'your-supabase-service-key',
     manualStripeIntegration: false,
     debug: true,
   });
   ```

2. **Define Your Plans and Limits**:  
   Use the `user_plans` table to store plan details and the `usage_feature_limits` table to set limits for specific features. This can be done via SQL, the Supabase Dashboard, or programmatically.

3. **Track Usage**:  
   Log user activity with the `trackEvent` method, which records every action in the `usage_events` table.

   ```javascript
   await usageFlow.trackEvent({
     userId: 'user-123',
     feature_name: 'api-call',
     creditsUsed: 1,
   });
   ```

4. **Enforce Limits**:  
   Use the `authorize` method to check if a user is within their plan's usage limits before granting access to a feature.

   ```javascript
   const isAuthorized = await usageFlow.authorize({
     userId: 'user-123',
     feature_name: 'api-call',
   });

   if (isAuthorized) {
     console.log("Access granted");
   } else {
     console.log("Limit exceeded. Upgrade required.");
   }
   ```

5. **Fetch Limits or Usage**:  
   Retrieve current feature limits or a user's usage history effortlessly.

   ```javascript
   const limit = await usageFlow.fetchFeatureLimit({
     planId: 1,
     featureName: 'ai_chat_limit',
   });
   console.log(limit); // e.g., 100
   ```

And that's it! UsageFlow handles all the complex logic in the background, allowing you to focus on building your SaaS product.

---

## Folder Structure

Here's a breakdown of the folder structure to help you navigate the project:

```
usageflow/
├── src/
│   ├── integrations/
│   │   ├── saas-payment-helper.js    # Integration with saas-subscription-helper
│   │   ├── stripe.js                 # Fallback for manual Stripe integration
│   ├── sdk/
│   │   ├── index.js                  # Main SDK logic
│   │   ├── enforce-limits.js         # Handles authorization and limit enforcement
│   │   ├── track-event.js            # Logs usage events
│   ├── utils/
│   │   ├── supabase.js               # Supabase client utilities
│   │   ├── validate-config.js        # Validates configuration during initialization
├── examples/
│   ├── standalone-integration.js     # Example for manual Stripe setup
│   ├── with-saas-payment-helper.js   # Example for saas-subscription-helper integration
├── LICENSE                           # MIT License file
├── README.md                         # Documentation for the package
├── package.json                      # NPM metadata and dependencies
├── .env.example                      # Example environment variables
```

### Key Components:
- **`src/integrations/`**: Handles integrations with Stripe (`stripe.js`) and `saas-subscription-helper`.
- **`src/sdk/`**: Contains core logic for tracking events, enforcing limits, and managing usage.
- **`src/utils/`**: Utility functions, including Supabase client setup and configuration validation.
- **`examples/`**: Ready-to-use examples for integrating UsageFlow into your project.


## Dependencies

Before installation, ensure you have the following dependencies:

- [Node.js](https://nodejs.org/): v14 or higher
- [Supabase](https://supabase.com/): For database management
- [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper): Simplifies subscription lifecycle management
- [Stripe](https://stripe.com/) (optional): For payment processing (if using `manualStripeIntegration`)

Install the required NPM packages:

```bash
npm install @supabase/supabase-js stripe saas-subscription-helper
```

---

## Installation

Install the package via npm:

```bash
npm install usageflow
```

---

## Quick Start

### **1. Initialize UsageFlow**

```javascript
const UsageFlow = require('usageflow');

const usageFlow = new UsageFlow({
  supabaseUrl: 'https://your-supabase-instance',
  supabaseKey: 'your-supabase-service-key',
  manualStripeIntegration: false, // Set to true for manual Stripe setups
  userPlansTable: 'custom_user_plans',       // Optional: Customize table name
  usageEventsTable: 'custom_usage_events',   // Optional: Customize table name
  usageFeatureLimitsTable: 'custom_usage_feature_limits', // Optional: Customize table for feature limits
  debug: true,           // Enable debug logging
});
```

> **Note:** By default, UsageFlow assumes you are using `saas-subscription-helper`. Set `manualStripeIntegration` to `true` if not.

---

## Required Supabase Schema

You can use your existing tables or create new ones as outlined below. Specify custom table names in the configuration if needed.

### **`user_plans` Table**

Defines the available plans in your system. This table serves as a reference for plan configurations and their corresponding Stripe prices.

```sql
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                    -- Plan name (e.g., "Basic Plan", "Free")
    stripe_price_id TEXT UNIQUE,           -- Stripe Price ID (NULL for free plans)
    price_amount DECIMAL(10,2),            -- Price amount (NULL for free plans)
    price_currency TEXT,                   -- Currency code (e.g., 'USD')
    is_free BOOLEAN DEFAULT FALSE,         -- Identifies free plans
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Example: Insert plans including free tier
INSERT INTO user_plans (name, stripe_price_id, price_amount, price_currency, is_free) VALUES
    ('Free Plan', NULL, NULL, NULL, TRUE),
    ('Basic Plan', 'price_basic123', 9.99, 'USD', FALSE),
    ('Pro Plan', 'price_pro456', 29.99, 'USD', FALSE);
```

#### Price Management

UsageFlow handles plan prices in two ways:

1. **Free Plans:**
   - Set `is_free = TRUE`
   - Leave `stripe_price_id`, `price_amount`, and `price_currency` as `NULL`
   - Example: `('Free Plan', NULL, NULL, NULL, TRUE)`

2. **Paid Plans:**
   - Set `is_free = FALSE`
   - Include Stripe Price ID and price details
   - Example: `('Pro Plan', 'price_pro456', 29.99, 'USD', FALSE)`

#### Initial Setup & Price Synchronization

1. **Initial Setup (Required):**
   First, create your plans in Stripe, then add them to your database:
   ```sql
   -- Get your Stripe Price IDs from the Stripe Dashboard
   INSERT INTO user_plans (name, stripe_price_id, price_amount, price_currency, is_free) VALUES
       ('Free Plan', NULL, NULL, NULL, TRUE),
       ('Basic Plan', 'price_basic123', 9.99, 'USD', FALSE),
       ('Pro Plan', 'price_pro456', 29.99, 'USD', FALSE);
   ```

2. **Ongoing Synchronization:**
   After initial setup, when using `saas-subscription-helper`:
   - Price changes in Stripe trigger a `price.updated` webhook
   - UsageFlow automatically updates the `price_amount` and `price_currency` fields
   - No manual intervention required for ongoing updates

3. **Manual Updates (if needed):**
   ```sql
   UPDATE user_plans 
   SET price_amount = 19.99,
       updated_at = NOW()
   WHERE stripe_price_id = 'price_basic123';
   ```

> **Note:** For display purposes, prices are stored in the database, but actual billing always uses live Stripe prices. This ensures accurate billing while providing fast price display in your application.

### **`usage_feature_limits` Table**

Tracks feature-specific usage limits for each plan. You can manage these limits through Supabase Dashboard directly or via SQL queries.

[![Image from Gyazo](https://i.gyazo.com/25a0a5c3cc82704384beb5cdf8945bde.png)](https://gyazo.com/25a0a5c3cc82704384beb5cdf8945bde)
> **Important Security Warning:** Ensure Row Level Security (RLS) is enabled for all tables to prevent unauthorized access.

```sql
CREATE TABLE usage_feature_limits (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL REFERENCES user_plans(id), -- Links to `user_plans`
    feature_name TEXT NOT NULL,                     -- Feature name (e.g., "ai_chat_limit")
    limit_value INT NOT NULL,                       -- Limit value (-1 for unlimited)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **`usage_events` Table**

Logs user activity for tracking usage.

```sql
CREATE TABLE usage_events (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- User's unique identifier
    feature_name TEXT NOT NULL,           -- Feature being used (e.g., "ai_chat_limit")
    credits_used INT NOT NULL,            -- Number of credits consumed
    metadata JSONB,                       -- Additional event data (e.g., {"model": "gpt-4o-mini"})
    timestamp TIMESTAMP DEFAULT NOW()      -- When the event occurred
);
```

> **Note:** User and subscription management is handled either through `saas-subscription-helper` or direct Stripe API integration, depending on your configuration.

### Performance Indexes

For optimal performance, create the following indexes on the `usage_events` table:

```sql
   CREATE INDEX idx_usage_events_user_feature ON usage_events(user_id, feature_name);
   CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp);
```
---

## Managing Feature Limits

### Adding a New Feature Limit

You can manage feature limits directly through the Supabase Dashboard or via SQL queries:

1. Identify the `plan_id` for the relevant plan:

   ```sql
   SELECT id FROM user_plans WHERE stripe_price_id = 'price_1XYZ';
   ```

2. Insert a new row into `usage_feature_limits`:

   ```sql
   INSERT INTO usage_feature_limits (plan_id, feature_name, limit_value)
   VALUES (1, 'ai_chat_limit', 100);
   ```

### Updating an Existing Feature Limit

To update an existing feature limit:

```sql
UPDATE usage_feature_limits
SET limit_value = 200, updated_at = NOW()
WHERE plan_id = 1 AND feature_name = 'ai_chat_limit';
```

### Removing a Feature Limit

To remove a feature limit:

```sql
DELETE FROM usage_feature_limits
WHERE plan_id = 1 AND feature_name = 'ai_chat_limit';
```

---

## UsageFlow Functions

### **1. Track Usage**

Use the `trackEvent` method to log usage data:

```javascript
await usageFlow.trackEvent({
  userId: 'user-123',
  feature_name: 'image-enhancement',
  creditsUsed: 5,
  metadata: { resolution: '4K' }
});
```

### **2. Enforce Limits**

Use the `authorize` method to validate user access:

```javascript
const isAuthorized = await usageFlow.authorize({
  userId: 'user-123',
  feature_name: 'ai_chat_limit'
});

if (isAuthorized) {
  console.log("Access granted");
} else {
  console.log("Limit exceeded. Upgrade required.");
}
```

### **3. Fetch Feature Limits**

Retrieve the limit for a specific feature:

```javascript
const limit = await usageFlow.fetchFeatureLimit({
  planId: 1,
  featureName: 'ai_chat_limit'
});
console.log(limit); // e.g., 100
```

### **4. Fetch Usage**

Get current usage and limits for a user and feature:

```javascript
const usage = await usageFlow.fetchUsage({
  userId: 'user-123',
  featureName: 'ai_chat_limit'
});

console.log(usage);
// Output:
// {
//   current: 50,        // Total credits used
//   limit: 100,         // Maximum allowed (null if unlimited)
//   remaining: 50,      // Credits remaining (null if unlimited)
//   isUnlimited: false  // Whether feature has no limit
// }
```

## Helper Functions

### **1. Test Connection**

Verify your UsageFlow setup and database connectivity:

```javascript
const isConnected = await usageFlow.connectionCheck();
console.log(isConnected ? "Connected successfully" : "Connection failed");
```

### **2. Debug Mode**

Enable detailed logging by setting `debug: true` in your configuration:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-url',
  supabaseKey: 'your-key',
  debug: true
});
```

### **3. Custom Table Names**

Override default table names in your configuration:

```javascript
const usageFlow = new UsageFlow({
  supabaseUrl: 'your-url',
  supabaseKey: 'your-key',
  userPlansTable: 'custom_user_plans',
  usageEventsTable: 'custom_usage_events',
  usageFeatureLimitsTable: 'custom_usage_feature_limits'
});
```

## Testing Your Setup

### 1. Configuration Test

```javascript
// Test your configuration and connections
async function testSetup() {
  try {
    // Test database connection
    const isConnected = await usageFlow.connectionCheck();
    console.log('Database connection:', isConnected ? 'OK' : 'Failed');

    // Test feature tracking
    await usageFlow.trackEvent({
      userId: 'test-user',
      feature_name: 'test-feature',
      creditsUsed: 1
    });
    console.log('Event tracking: OK');

    // Test usage fetching
    const usage = await usageFlow.fetchUsage({
      userId: 'test-user',
      featureName: 'test-feature'
    });
    console.log('Usage fetching:', usage);

  } catch (error) {
    console.error('Setup test failed:', error);
  }
}
```

### 2. Verify Database Tables

Ensure your tables are properly set up:

```sql
-- Check if tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'usage_events'
);

-- Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usage_events';
```

### 3. Test RLS Policies

```sql
-- Test RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('usage_events', 'usage_feature_limits', 'user_plans');
```

---

## Manual Stripe Integration

If you're not using `saas-subscription-helper`, enable `manualStripeIntegration` and provide the necessary Stripe configuration.

### Overwriting Functions for Manual Integration

For `manualStripeIntegration`, the following functions need to be implemented:

1. **`fetchSubscription`:**

   Define a custom function to retrieve subscription details directly from Stripe:

   ```javascript
   const stripe = require('stripe');

   async function fetchSubscription(stripeApiKey, email) {
     const stripeClient = stripe(stripeApiKey);
     const customers = await stripeClient.customers.list({ email, limit: 1 });

     if (!customers.data.length) return null;

     const subscriptions = await stripeClient.subscriptions.list({
       customer: customers.data[0].id,
       limit: 1,
       status: 'active',
     });

     return subscriptions.data[0];
   }
   ```

2. **Customizing `fetchUserPlan` and `authorize`:**

   Use `fetchSubscription` to implement your own `fetchUserPlan` logic:

   ```javascript
    const UsageFlow = require('usageflow');
    const stripe = require('stripe');

    // Initialize UsageFlow
    const usageFlow = new UsageFlow({
    supabaseUrl: 'https://your-supabase-instance',
    supabaseKey: 'your-supabase-service-key',
    manualStripeIntegration: true, // Enable manual Stripe integration
    debug: true, // Enable debug mode
    });

    // Define custom fetchSubscription function
    async function fetchSubscription(stripeApiKey, email) {
    const stripeClient = stripe(stripeApiKey);

    const customers = await stripeClient.customers.list({ email, limit: 1 });
    if (!customers.data.length) return null;

    const subscriptions = await stripeClient.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        limit: 1,
    });

    return subscriptions.data[0];
    }

    // Extend fetchUserPlan
    async function fetchUserPlan(email) {
    const subscription = await fetchSubscription('your-stripe-secret-key', email);

    if (!subscription) {
        throw new Error('No active subscription found for this user.');
    }

    return {
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status,
    };
    }

    // Example Usage
    (async () => {
    try {
        const plan = await fetchUserPlan('user@example.com');
        console.log('User Plan:', plan);

        const isAuthorized = await usageFlow.authorize({
        userId: 'user-123',
        feature_name: 'api-call',
        });

        console.log(isAuthorized ? 'Access granted' : 'Limit exceeded');
    } catch (error) {
        console.error('Error:', error.message);
    }
    })();

   ```

This approach provides a clean way to handle Stripe subscriptions without relying on `saas-subscription-helper`.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE.md) file for details.

---

## Contributing

We welcome contributions! Feel free to fork the repository, open issues, or submit pull requests.

---

## Author

Created by Richardson Dackam. Reach out on Twitter: [@richardsondx](https://twitter.com/richardsondx).

## Webhook Setup

### Using with saas-subscription-helper

When using UsageFlow with saas-subscription-helper, price synchronization happens automatically through the same webhook endpoint. No additional webhook setup is required.

1. **Set up your webhook endpoint** (if not already done):
   ```javascript
   // app/api/webhooks/route.js
   import { subscriptionHelper } from '@/lib/subscription'
   
   export async function POST(req) {
     try {
       await subscriptionHelper.handleWebhooks({
         rawBody: await req.text(),
         stripeSignature: req.headers.get("stripe-signature"),
         headers: Object.fromEntries(req.headers)
       })
       return NextResponse.json({ received: true })
     } catch (err) {
       return NextResponse.json({ error: err.message }, { status: 400 })
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
   - Add endpoint URL: `https://your-domain.com/api/webhooks`
   - Select events to listen for:
     - `price.updated` (for UsageFlow price syncing)
     - `customer.subscription.updated` (for subscription management)
     - Other events required by saas-subscription-helper

### Using Edge Functions

If you're hosting your webhook endpoint as an edge function:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { subscriptionHelper } from '@/lib/subscription'

Deno.serve(async (req) => {
  try {
    await subscriptionHelper.handleWebhooks(req)
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { 'Content-Type': 'application/json' }}
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' }}
    )
  }
})
```

### Manual Stripe Integration

If you're not using saas-subscription-helper, you'll need to handle the `price.updated` webhook event manually:

```javascript
// app/api/webhooks/route.js
import Stripe from 'stripe'
import { usageFlow } from '@/lib/usage-flow'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (event.type === 'price.updated') {
      await usageFlow.syncPrice(event.data.object)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
```

### Required Webhook Events

| Event | Purpose | Required By |
|-------|----------|------------|
| `price.updated` | Syncs price changes from Stripe | UsageFlow |
| `customer.subscription.updated` | Updates subscription status | saas-subscription-helper |
| Other subscription events | Manages subscription lifecycle | saas-subscription-helper |

> **Note:** When using saas-subscription-helper, all webhook events are handled through a single endpoint. UsageFlow extends the webhook handler to include price syncing without requiring additional configuration.

### Webhook Security

Always ensure your webhook endpoint:
1. Verifies the Stripe signature
2. Uses environment variables for secrets
3. Returns 200 for successful processing
4. Returns 4xx for validation errors

For more details on webhook security, see [Stripe's webhook documentation](https://stripe.com/docs/webhooks/best-practices).

### Usage Calculations

UsageFlow provides efficient methods to calculate usage totals and statistics:

1. **Get Total Usage**
   ```javascript
   const total = await usageFlow.getTotalUsage({
     userId: 'user-123',
     feature_name: 'ai_chat_limit',
     period: 'current_month'  // Optional: defaults to current billing period
   });
   console.log(total); // e.g., 150
   ```

   Available period options:
   - `current_month`: From the start of the current month
   - `last_30_days`: Rolling 30-day window
   - `last_28_days`: Rolling 28-day window (useful for consistent month-to-month comparisons)
   - `current_week`: From the start of the current week

2. **Get Usage Statistics**
   ```javascript
   const stats = await usageFlow.getUsageStats({
     userId: 'user-123',
     feature_name: 'ai_chat_limit',
     period: 'current_month',  // Same period options as above
     groupBy: 'day'  // Optional: 'hour', 'day', 'week', 'month'
   });
   console.log(stats);
   // {
   //   total: 150,
   //   average: 12.5,
   //   max: 25,
   //   min: 5,
   //   byPeriod: [
   //     { date: '2024-01-01', total: 25 },
   //     { date: '2024-01-02', total: 15 }
   //   ]
   // }
   ```

#### Batch Operations**

For multiple features or users:
```javascript
const batchStats = await usageFlow.getBatchUsageStats({
  userIds: ['user-123', 'user-456'],
  feature_names: ['ai_chat_limit', 'image_generation'],
  period: 'current_month'
});
```

> **Note:** These methods use database-level aggregations instead of in-memory calculations, making them much more efficient for large datasets.
