import { validateConfig } from '../utils/validate-config'
import SupabaseClient from '../utils/supabase'
import { UsageTracker } from './track-event'
import { LimitEnforcer } from './enforce-limits'
import { PaymentHelper } from '../integrations/saas-payment-helper'
import { StripeIntegration } from '../integrations/stripe'

export class UsageFlow {
  constructor(config) {
    this.config = validateConfig(config)
    this.supabase = new SupabaseClient(config.supabaseUrl, config.supabaseKey)
    this.tracker = new UsageTracker(this.supabase, this.config)
    this.enforcer = new LimitEnforcer(this.supabase, this.config)
    
    if (this.config.manualStripeIntegration) {
      this.stripe = new StripeIntegration(config.stripeSecretKey)
    } else {
      this.payments = new PaymentHelper(config)
    }
  }

  async trackEvent(params) {
    return await this.tracker.trackEvent(params)
  }

  async authorize(params) {
    return await this.enforcer.authorize(params)
  }

  async fetchFeatureLimit({ planId, featureName }) {
    const [limit] = await this.supabase.fetch(this.config.usageFeatureLimitsTable, {
      column: 'feature_name',
      value: featureName
    })
    return limit?.limit_value
  }
}