# UsageFlow (in development)

**A lightweight Node.js package for usage tracking and limit enforcement in SaaS applications.**

⚠️ Not production ready yet.

UsageFlow integrates seamlessly with [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper) to manage subscriptions or works with manual Stripe setups for custom implementations. This flexibility makes it ideal for SaaS developers looking to add usage-based controls to their apps.

# UsageFlow

**A lightweight Node.js package for usage tracking and limit enforcement in SaaS applications.**

UsageFlow integrates seamlessly with [`saas-subscription-helper`](https://github.com/richardsondx/saas-subscription-helper) to manage subscriptions or works with manual Stripe setups for custom implementations. This flexibility makes it ideal for SaaS developers looking to add usage-based controls to their apps.

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
     eventType: 'api-call',
     creditsUsed: 1,
   });
   ```

4. **Enforce Limits**:  
   Use the `authorize` method to check if a user is within their plan's usage limits before granting access to a feature.

   ```javascript
   const isAuthorized = await usageFlow.authorize({
     userId: 'user-123',
     eventType: 'api-call',
   });

   if (isAuthorized) {
     console.log("Access granted");
   } else {
     console.log("Limit exceeded. Upgrade required.");
   }
   ```

5. **Fetch Limits or Usage**:  
   Retrieve current feature limits or a user’s usage history effortlessly.

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

Here’s a breakdown of the folder structure to help you navigate the project:

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

Defines high-level plan details and links to Stripe pricing.

```sql
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                    -- Plan name (e.g., "Basic Plan")
    stripe_price_id TEXT UNIQUE NOT NULL,  -- Stripe Price ID (e.g., "price_xxx")
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

### **`usage_feature_limits` Table**

Tracks feature-specific usage limits for each plan. You can manage these limits through Supabase Dashboard directly or via SQL queries.

```sql
CREATE TABLE usage_feature_limits (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL REFERENCES user_plans(id), -- Links to `user_plans`
    feature_name TEXT NOT NULL,                     -- Feature name (e.g., "ai_chat_limit")
    limit_value INT NOT NULL,                       -- Limit value (-1 for unlimited)
    created_at TIMESTAMP DEFAULT NOW(),             -- When the limit was created
    updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW() -- When the limit was last updated
);
```

### **`usage_events` Table**

Logs user activity for tracking usage.

```sql
CREATE TABLE usage_events (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                -- User's unique identifier
    event_type TEXT NOT NULL,             -- Type of event (e.g., "api-call")
    credits_used INT NOT NULL,            -- Number of credits consumed
    timestamp TIMESTAMP DEFAULT NOW()     -- When the event occurred
);
```

### **`users` Table**

Manages subscription data and plan assignment.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,                  -- User email
    subscription_status TEXT NOT NULL,    -- Subscription status (e.g., "active", "canceled")
    plan TEXT NOT NULL,                   -- Stripe Price ID (e.g., "price_xxx")
    created_at TIMESTAMP DEFAULT NOW()
);
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

## UsageFlow Methods

### **1. Track Usage**

Use the `trackEvent` method to log usage data:

```javascript
await usageFlow.trackEvent({
  userId: 'user-123',
  eventType: 'image-enhancement',
  creditsUsed: 5,
  metadata: { resolution: '4K' },
});
```

### **2. Enforce Limits**

Use the `authorize` method to validate user access:

```javascript
const isAuthorized = await usageFlow.authorize({
  userId: 'user-123',
  eventType: 'image-enhancement',
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
    featureName: 'ai_chat_limit',
});
console.log(limit); // e.g., 100
```

---

## Testing the Setup

To ensure everything is working properly, follow these steps:

1. **Verify Environment Variables:**

   - Ensure `supabaseUrl`, `supabaseKey`, and other necessary variables are correctly set.

2. **Check Database Tables:**

   - Verify the `userPlansTable`, `usageFeatureLimitsTable`, and `usageEventsTable` tables are created and accessible in your Supabase instance.

3. **Review Supabase Policies:**

   - Check your Supabase Row Level Security (RLS) policies to ensure the necessary read and write operations are allowed for the configured tables.

4. **Test Event Tracking:**

   - Use the `trackEvent` method and confirm that usage events are logged in the database.

   ```javascript
   await usageFlow.trackEvent({
     userId: 'user-123',
     eventType: 'api-call',
     creditsUsed: 10,
   });
   ```

   Check the `usage_events` table for the new entry.

5. **Validate Authorization Logic:**

   - Use the `authorize` method to ensure usage limits are enforced correctly.

   ```javascript
   const isAuthorized = await usageFlow.authorize({
     userId: 'user-123',
     eventType: 'api-call',
   });
   console.log(isAuthorized ? "Access granted" : "Limit exceeded");
   ```

6. **Debugging Setup:**

   - Enable `debug: true` in the configuration to view detailed logs.
   - Call the following helper function to test connectivity and configuration:

   ```javascript
   async function testSetup() {
     const result = await usageFlow.testConnection();
     console.log(result);
   }

   testSetup();
   ```

---

## Manual Stripe Integration

If you’re not using `saas-subscription-helper`, enable `manualStripeIntegration` and provide the necessary Stripe configuration.

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
        eventType: 'api-call',
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
```

