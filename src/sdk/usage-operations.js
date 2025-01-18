import { throwError, ErrorCodes } from '../utils/errors'

export class UsageOperations {
  constructor(supabaseClient, config, debug) {
    this.supabase = supabaseClient
    this.config = config
    this.debug = debug
  }

  async incrementUsage({ userId, featureName, creditsUsed, metadata = {} }) {
    this.debug.log('UsageOperations', 'Incrementing usage', { 
      userId, featureName, creditsUsed, metadata 
    })

    try {
      if (!userId || !featureName || typeof creditsUsed !== 'number') {
        throwError(
          ErrorCodes.USAGE_INVALID_PARAMS,
          'userId, featureName, and creditsUsed are required',
          { userId, featureName, creditsUsed }
        )
      }

      const event = {
        user_id: userId,
        feature_name: featureName,
        credits_used: creditsUsed,
        event_type: 'usage',
        metadata,
        timestamp: new Date().toISOString()
      }

      try {
        return await this.supabase.insert(this.config.usageEventsTable, event)
      } catch (dbError) {
        throwError(
          ErrorCodes.USAGE_CONFIG_ERROR,
          'Failed to insert usage event',
          { 
            originalError: dbError.message,
            event,
            table: this.config.usageEventsTable 
          }
        )
      }

    } catch (error) {
      this.debug.error('UsageOperations', 'Failed to track usage', error)
      throw error
    }
  }

  async adjustUsage({ userId, featureName, amount, metadata = {} }) {
    this.debug.log('UsageOperations', 'Adjusting usage', {
      userId, featureName, amount, metadata
    })

    try {
      if (!userId || !featureName || typeof amount !== 'number') {
        throwError(
          ErrorCodes.USAGE_INVALID_PARAMS,
          'userId, featureName, and amount are required',
          { userId, featureName, amount }
        )
      }

      if (!metadata.reason) {
        throwError(
          ErrorCodes.USAGE_ADJUSTMENT_ERROR,
          'Adjustment metadata must include reason',
          { metadata }
        )
      }

      const event = {
        user_id: userId,
        feature_name: featureName,
        credits_used: amount,
        event_type: 'adjustment',
        metadata,
        timestamp: new Date().toISOString()
      }

      const result = await this.supabase.insert(this.config.usageEventsTable, event)
      this.debug.log('UsageOperations', 'Usage adjusted successfully', { result })
      return result

    } catch (error) {
      this.debug.error('UsageOperations', 'Failed to adjust usage', error)
      throw error
    }
  }
} 