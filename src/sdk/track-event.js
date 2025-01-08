export class UsageTracker {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async trackEvent({ userId, eventType, creditsUsed, metadata = {} }) {
    if (!userId || !eventType || typeof creditsUsed !== 'number') {
      throw new Error('Missing required parameters: userId, eventType, creditsUsed')
    }

    const event = {
      user_id: userId,
      event_type: eventType,
      credits_used: creditsUsed,
      metadata,
      timestamp: new Date().toISOString()
    }

    return await this.supabase.insert(this.config.usageEventsTable, event)
  }
}