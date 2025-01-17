export class UsageCalculator {
  constructor(supabaseClient, config, debug) {
    this.supabase = supabaseClient
    this.config = config
    this.debug = debug
  }

  async getTotalUsage({ userId, featureName, period = 'current_month' }) {
    this.debug.log('UsageCalculator', 'Fetching total usage', {
      userId, featureName, period
    })

    if (!userId || !featureName) {
      throw new Error('Missing required parameters: userId, featureName')
    }

    try {
      const startDate = this._getStartDate(period)

      const { data: events } = await this.supabase.client
        .from(this.config.usageEventsTable)
        .select('credits_used, event_type')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .gte('timestamp', startDate.toISOString())
        .in('event_type', ['usage', 'adjustment', 'credit'])

      const result = events?.reduce((sum, event) => sum + (event.credits_used || 0), 0) || 0
      this.debug.log('UsageCalculator', 'Total usage fetched', { total: result })
      return result

    } catch (error) {
      this.debug.error('UsageCalculator', 'Failed to fetch total usage', error)
      throw error
    }
  }

  async getUsageStats({ userId, featureName, period = 'current_month', groupBy = 'day' }) {
    this.debug.log('UsageCalculator', 'Fetching usage stats', {
      userId, featureName, period, groupBy
    })

    if (!userId || !featureName) {
      throw new Error('Missing required parameters: userId, featureName')
    }

    if (!['hour', 'day', 'week', 'month'].includes(groupBy)) {
      throw new Error('Invalid groupBy parameter. Must be one of: hour, day, week, month')
    }

    try {
      const startDate = this._getStartDate(period)

      const { data: events } = await this.supabase.client
        .from(this.config.usageEventsTable)
        .select('credits_used, timestamp')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true })

      if (!events?.length) {
        return {
          total: 0,
          average: 0,
          max: 0,
          min: 0,
          byPeriod: []
        }
      }

      const groupedEvents = this._groupEventsByPeriod(events, groupBy)
      return this._calculateStats(groupedEvents)
    } catch (error) {
      this.debug.error('UsageCalculator', 'Failed to fetch usage stats', error)
      throw error
    }
  }

  async getBatchUsageStats({ userIds, featureNames, period = 'current_month' }) {
    this.debug.log('UsageCalculator', 'Fetching batch usage stats', {
      userIds, featureNames, period
    })

    if (!userIds?.length || !featureNames?.length) {
      throw new Error('Missing required parameters: userIds, featureNames')
    }

    const results = {}
    
    for (const userId of userIds) {
      results[userId] = {}
      for (const feature of featureNames) {
        results[userId][feature] = await this.getUsageStats({
          userId,
          featureName: feature,
          period
        })
      }
    }

    return results
  }

  // Private helper methods
  _getStartDate(period) {
    const now = new Date()
    switch (period) {
      case 'current_month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'last_30_days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'last_28_days':
        return new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
      case 'current_week':
        return new Date(now.setDate(now.getDate() - now.getDay()))
      default:
        throw new Error('Invalid period. Must be one of: current_month, last_30_days, last_28_days, current_week')
    }
  }

  _groupEventsByPeriod(events, groupBy) {
    const grouped = {}
    
    for (const event of events) {
      const date = new Date(event.timestamp)
      let periodKey = this._getPeriodKey(date, groupBy)

      if (!grouped[periodKey]) {
        grouped[periodKey] = []
      }
      grouped[periodKey].push(event)
    }

    return grouped
  }

  _getPeriodKey(date, groupBy) {
    switch (groupBy) {
      case 'hour':
        return date.toISOString().slice(0, 13) + ':00:00Z'
      case 'day':
        return date.toISOString().slice(0, 10)
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().slice(0, 10)
      case 'month':
        return date.toISOString().slice(0, 7)
    }
  }

  _calculateStats(groupedEvents) {
    const stats = {
      total: 0,
      max: 0,
      min: Infinity,
      byPeriod: []
    }

    for (const [date, periodEvents] of Object.entries(groupedEvents)) {
      const periodTotal = periodEvents.reduce((sum, e) => sum + (e.credits_used || 0), 0)
      stats.total += periodTotal
      stats.max = Math.max(stats.max, periodTotal)
      stats.min = Math.min(stats.min, periodTotal)
      stats.byPeriod.push({ date, total: periodTotal })
    }

    stats.average = stats.total / stats.byPeriod.length
    stats.min = stats.min === Infinity ? 0 : stats.min

    return stats
  }
} 