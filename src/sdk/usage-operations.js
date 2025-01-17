export class UsageOperations {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async incrementUsage({ userId, featureName, creditsUsed, metadata = {} }) {
    if (!userId || !featureName || typeof creditsUsed !== 'number') {
      throw new Error('Missing required parameters: userId, featureName, creditsUsed')
    }

    const event = {
      user_id: userId,
      feature_name: featureName,
      credits_used: creditsUsed,
      event_type: 'usage',
      metadata,
      timestamp: new Date().toISOString()
    }

    return await this.supabase.insert(this.config.usageEventsTable, event)
  }

  async adjustUsage({ userId, featureName, amount, metadata = {} }) {
    if (!userId || !featureName || typeof amount !== 'number') {
      throw new Error('Missing required parameters: userId, featureName, amount')
    }

    if (!metadata.reason) {
      throw new Error('Adjustment metadata must include a reason')
    }

    const event = {
      user_id: userId,
      feature_name: featureName,
      credits_used: amount,
      event_type: 'adjustment',
      metadata,
      timestamp: new Date().toISOString()
    }

    return await this.supabase.insert(this.config.usageEventsTable, event)
  }
} 