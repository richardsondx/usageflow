import { SaasSubscriptionHelper } from 'saas-subscription-helper'

export class PaymentHelper {
  constructor(config) {
    this.helper = new SaasSubscriptionHelper({
      stripeSecretKey: config.stripeSecretKey,
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey
    })
  }

  async syncSubscription(userId) {
    return await this.helper.syncSubscription(userId)
  }

  async handleWebhook(event) {
    return await this.helper.handleWebhook(event)
  }
}
