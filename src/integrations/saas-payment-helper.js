import { SubscriptionHelper } from 'saas-subscription-helper'

export class PaymentHelper {
  constructor(config) {
    this.helper = new SubscriptionHelper({
      stripeSecretKey: config.stripeSecretKey,
      stripeWebhookSecret: config.stripeWebhookSecret,
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey
    })

    // Extend the webhook handler to include price syncing
    const originalHandler = this.helper.handleWebhooks
    this.helper.handleWebhooks = async (params) => {
      await originalHandler(params)
      
      // Add price sync logic
      if (params.type === 'price.updated') {
        await this.syncPrice(params.data.object, config.userPlansTable || 'user_plans')
      }
    }
  }

  async syncPrice(priceObject, tableName) {
    const { supabase } = this.helper
    await supabase
      .from(tableName)
      .update({ 
        price_amount: priceObject.unit_amount / 100,
        price_currency: priceObject.currency,
        updated_at: new Date()
      })
      .match({ stripe_price_id: priceObject.id })
  }

  async syncSubscription(userId) {
    return await this.helper.syncSubscription(userId)
  }

  async handleWebhook(event) {
    return await this.helper.handleWebhooks(event)
  }
}
