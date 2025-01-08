import Stripe from 'stripe'

export class StripeIntegration {
  constructor(stripeSecretKey) {
    this.stripe = new Stripe(stripeSecretKey)
  }

  async fetchSubscription(email) {
    const customers = await this.stripe.customers.list({ 
      email, 
      limit: 1 
    })

    if (!customers.data.length) return null

    const subscriptions = await this.stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 1
    })

    return subscriptions.data[0]
  }

  async updateSubscription(subscriptionId, metadata) {
    return await this.stripe.subscriptions.update(subscriptionId, {
      metadata
    })
  }
}