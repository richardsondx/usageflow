export class LimitEnforcer {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async authorize({ userId, eventType }) {
    // Get user's current plan
    const [user] = await this.supabase.fetch('users', {
      column: 'id',
      value: userId
    })

    if (!user || !user.plan) {
      throw new Error('User not found or no plan assigned')
    }

    // Get feature limits for the plan
    const [limit] = await this.supabase.fetch(this.config.usageFeatureLimitsTable, {
      column: 'feature_name',
      value: eventType
    })

    if (!limit) return true // No limit defined means unlimited usage

    // Get current usage
    const { data: usage } = await this.supabase.client
      .from(this.config.usageEventsTable)
      .select('credits_used')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const totalUsage = usage.reduce((sum, event) => sum + event.credits_used, 0)

    return totalUsage < limit.limit_value
  }
}