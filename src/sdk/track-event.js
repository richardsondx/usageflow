export class UsageTracker {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async trackEvent({ userId, feature_name, creditsUsed, metadata = {} }) {
    if (!userId || !feature_name || typeof creditsUsed !== 'number') {
      throw new Error('Missing required parameters: userId, feature_name, creditsUsed')
    }

    const event = {
      user_id: userId,
      feature_name: feature_name,
      credits_used: creditsUsed,
      metadata,
      timestamp: new Date().toISOString()
    }

    return await this.supabase.insert(this.config.usageEventsTable, event)
  }
}