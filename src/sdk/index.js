import { validateConfig } from '../utils/validate-config'
import SupabaseClient from '../utils/supabase'
import { UsageOperations } from './usage-operations'
import { LimitEnforcer } from './enforce-limits'
import { UsageCalculator } from './usage-calculator'
import { PaymentHelper } from '../integrations/saas-payment-helper'
import { StripeIntegration } from '../integrations/stripe'
import { LimitAdjustment } from './limit-adjustment'
import { DebugLogger } from '../utils/debug-logger'

export class UsageFlow {
  constructor(config) {
    this.config = validateConfig(config)
    this.debug = new DebugLogger(config.debug)
    
    this.debug.log('UsageFlow', 'Initializing SDK', { config: { ...config, supabaseKey: '[REDACTED]' } })
    
    this.supabase = new SupabaseClient(config.supabaseUrl, config.supabaseKey)
    
    // Pass debug logger to all modules
    this.operations = new UsageOperations(this.supabase, this.config, this.debug)
    this.enforcer = new LimitEnforcer(this.supabase, this.config, this.debug)
    this.calculator = new UsageCalculator(this.supabase, this.config, this.debug)
    
    // Initialize payment integration
    if (this.config.manualStripeIntegration) {
      this.stripe = new StripeIntegration(config.stripeSecretKey)
    } else {
      this.payments = new PaymentHelper(config)
    }

    if (config.enableUserAdjustments) {
      this.adjustment = new LimitAdjustment(this.supabase, this.config)
    }
  }

  // Public API methods
  async incrementUsage(params) {
    return await this.operations.incrementUsage(params)
  }

  async adjustUsage(params) {
    return await this.operations.adjustUsage(params)
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

  async addLimitAdjustment(params) {
    if (!this.config.enableUserAdjustments) {
      throw new Error('User adjustments are not enabled in configuration')
    }
    return await this.adjustment.addAdjustment(params)
  }

  async fetchUsage({ userId, featureName }) {
    if (!userId || !featureName) {
      throw new Error('USAGE_INVALID_PARAMS: userId and featureName are required')
    }

    // Let database errors pass through
    const [currentUsage, limit] = await Promise.all([
      this.calculator.getTotalUsage({ userId, featureName }),
      this.enforcer.fetchFeatureLimitForUser({ userId, featureName })
    ]);

    return {
      current: currentUsage,
      limit: limit,
      remaining: limit === null ? null : limit - currentUsage,
      isUnlimited: limit === null
    };
  }
}