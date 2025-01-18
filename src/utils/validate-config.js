import { throwError, ErrorCodes } from './errors'

export function validateConfig(config) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throwError(
      ErrorCodes.USAGE_CONFIG_ERROR,
      'Missing required configuration: supabaseUrl and supabaseKey',
      { provided: Object.keys(config) }
    )
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    debug: !!config.debug,
    manualStripeIntegration: !!config.manualStripeIntegration,
    enableUserAdjustments: !!config.enableUserAdjustments,
    userPlansTable: config.userPlansTable || 'user_plans',
    usageEventsTable: config.usageEventsTable || 'usage_events',
    usageFeatureLimitsTable: config.usageFeatureLimitsTable || 'usage_feature_limits',
    userLimitAdjustmentsTable: config.userLimitAdjustmentsTable || 'user_limit_adjustments'
  }
}