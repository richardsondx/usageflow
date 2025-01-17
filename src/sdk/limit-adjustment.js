export class LimitAdjustment {
  constructor(supabaseClient, config) {
    this.supabase = supabaseClient
    this.config = config
  }

  async getActiveAdjustments({ userId, featureName }) {
    if (!this.config.enableUserAdjustments) {
      return 0
    }

    try {
      const { data: adjustments, error } = await this.supabase.client
        .from(this.config.userLimitAdjustmentsTable)
        .select('amount')
        .eq('customer_id', userId)
        .eq('feature_name', featureName)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())

      if (error) {
        if (this.config.debug) {
          console.error('Error fetching adjustments:', error)
        }
        throw error
      }

      return adjustments?.reduce((sum, adj) => sum + adj.amount, 0) || 0
    } catch (error) {
      if (this.config.debug) {
        console.error('Error in getActiveAdjustments:', error)
      }
      return 0 // Fail gracefully by returning no adjustments
    }
  }

  async addAdjustment({ userId, featureName, amount, type = 'one_time', startDate, endDate }) {
    if (!this.config.enableUserAdjustments) {
      throw new Error('User adjustments are not enabled in configuration')
    }

    const adjustment = {
      customer_id: userId,
      feature_name: featureName,
      amount,
      type,
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    const { error } = await this.supabase.client
      .from(this.config.userLimitAdjustmentsTable)
      .insert(adjustment)

    if (error) {
      if (this.config.debug) {
        console.error('Error adding adjustment:', error)
      }
      throw error
    }

    return adjustment
  }
} 