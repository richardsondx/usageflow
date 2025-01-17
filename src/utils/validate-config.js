export function validateConfig(config) {
  const required = ['supabaseUrl', 'supabaseKey']
  
  // Add stripe-related fields to required fields if not using manual integration
  if (!config.manualStripeIntegration) {
    required.push('stripeSecretKey', 'stripeWebhookSecret')
  }
  
  const missing = required.filter(key => !config[key])
  
  if (missing.length) {
    throw new Error(`Missing required config: ${missing.join(', ')}`)
  }

  // Set defaults for optional configs
  return {
    debug: false,
    manualStripeIntegration: false,
    userPlansTable: 'user_plans',
    usageEventsTable: 'usage_events',
    usageFeatureLimitsTable: 'usage_feature_limits',
    ...config
  }
}