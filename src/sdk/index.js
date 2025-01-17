import { validateConfig } from '../utils/validate-config'
import SupabaseClient from '../utils/supabase'
import { UsageTracker } from './track-event'
import { LimitEnforcer } from './enforce-limits'
import { UsageCalculator } from './usage-calculator'
import { PaymentHelper } from '../integrations/saas-payment-helper'
import { StripeIntegration } from '../integrations/stripe'

export class UsageFlow {
  constructor(config) {
    this.config = validateConfig(config)
    this.supabase = new SupabaseClient(config.supabaseUrl, config.supabaseKey)
    
    // Initialize modules
    this.tracker = new UsageTracker(this.supabase, this.config)
    this.enforcer = new LimitEnforcer(this.supabase, this.config)
    this.calculator = new UsageCalculator(this.supabase, this.config)
    
    // Initialize payment integration
    if (this.config.manualStripeIntegration) {
      this.stripe = new StripeIntegration(config.stripeSecretKey)
    } else {
      this.payments = new PaymentHelper(config)
    }
  }

  // Public API methods
  async trackEvent(params) {
    return await this.tracker.trackEvent(params)
  }

  async authorize(params) {
    return await this.enforcer.authorize(params)
  }

  async fetchFeatureLimit({ planId, featureName }) {
    return await this.enforcer.fetchFeatureLimit({ planId, featureName })
  }

  async fetchFeatureLimitForUser({ userId, featureName }) {
    return await this.enforcer.fetchFeatureLimitForUser({ userId, featureName })
  }

  async getTotalUsage(params) {
    return await this.calculator.getTotalUsage(params)
  }

  async getUsageStats(params) {
    return await this.calculator.getUsageStats(params)
  }

  async getBatchUsageStats(params) {
    return await this.calculator.getBatchUsageStats(params)
  }

  async connectionCheck() {
    try {
      await this.supabase.fetch(this.config.usageEventsTable, { limit: 1 });
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Connection check failed:', error);
      }
      return false;
    }
  }
}