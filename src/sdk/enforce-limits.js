export class LimitEnforcer {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async authorize({ userId, feature_name }) {
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
      value: feature_name
    })

    if (!limit) return true // No limit defined means unlimited usage

    // Get current usage
    const { data: usage } = await this.supabase.client
      .from(this.config.usageEventsTable)
      .select('credits_used')
      .eq('user_id', userId)
      .eq('feature_name', feature_name)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const totalUsage = usage.reduce((sum, event) => sum + event.credits_used, 0)

    return totalUsage < limit.limit_value
  }

  async fetchFeatureLimit({ planId, featureName }) {
    const [limit] = await this.supabase.fetch(this.config.usageFeatureLimitsTable, {
      column: 'feature_name',
      value: featureName
    })
    return limit?.limit_value
  }

  async fetchFeatureLimitForUser({ userId, featureName }) {
    try {
      // First get user's plan from profiles
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single()

      if (profileError) {
        if (this.config.debug) {
          console.error('Profile fetch error:', profileError)
        }
        throw new Error(`Failed to fetch profile: ${profileError.message}`)
      }

      if (!profile?.plan) {
        throw new Error('No plan found for user')
      }

      // Get the plan ID from user_plans using the stripe_price_id
      const { data: userPlan, error: planError } = await this.supabase.client
        .from('user_plans')
        .select('id')
        .eq('stripe_price_id', profile.plan)
        .single()

      if (planError) {
        if (this.config.debug) {
          console.error('Plan fetch error:', planError)
        }
        throw new Error(`Failed to fetch plan: ${planError.message}`)
      }

      if (!userPlan?.id) {
        throw new Error(`No plan found with stripe_price_id: ${profile.plan}`)
      }

      // Get the feature limit for this plan
      const { data: featureLimit, error: limitError } = await this.supabase.client
        .from(this.config.usageFeatureLimitsTable)
        .select('limit_value')
        .eq('plan_id', userPlan.id)
        .eq('feature_name', featureName)
        .single()

      if (limitError) {
        if (this.config.debug) {
          console.error('Feature limit fetch error:', limitError)
        }
        throw new Error(`Failed to fetch feature limit: ${limitError.message}`)
      }

      return featureLimit?.limit_value || null
    } catch (error) {
      if (this.config.debug) {
        console.error('Error in fetchFeatureLimitForUser:', error)
      }
      throw error
    }
  }
}