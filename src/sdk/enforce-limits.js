import { throwError, ErrorCodes } from '../utils/errors'
import { LimitAdjustment } from './limit-adjustment'

export class LimitEnforcer {
  constructor(supabaseClient, config, debug) {
    this.supabase = supabaseClient
    this.config = config
    this.debug = debug
    if (config.enableUserAdjustments) {
      this.adjustment = new LimitAdjustment(supabaseClient, config)
    }
  }

  async authorize({ userId, featureName }) {
    this.debug.log('LimitEnforcer', 'Checking authorization', {
      userId, featureName
    })

    try {
      if (!userId || !featureName) {
        throwError(
          ErrorCodes.USAGE_INVALID_PARAMS,
          'userId and featureName are required',
          { userId, featureName }
        )
      }

      // Get user's current plan
      const [user] = await this.supabase.fetch('users', {
        column: 'id',
        value: userId
      })

      if (!user || !user.plan) {
        throwError(
          ErrorCodes.USAGE_LIMIT_ERROR,
          'User not found or no plan assigned',
          { userId }
        )
      }

      // Get feature limits for the plan
      const [limit] = await this.supabase.fetch(this.config.usageFeatureLimitsTable, {
        column: 'feature_name',
        value: featureName
      })

      if (!limit) return true // No limit defined means unlimited usage

      // Get current usage and check limit
      const { data: usage } = await this.supabase.client
        .from(this.config.usageEventsTable)
        .select('credits_used')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const totalUsage = usage.reduce((sum, event) => sum + event.credits_used, 0)
      const isAuthorized = totalUsage < limit.limit_value

      this.debug.log('LimitEnforcer', 'Authorization result', { isAuthorized })
      return isAuthorized

    } catch (error) {
      this.debug.error('LimitEnforcer', 'Authorization check failed', error)
      throw error
    }
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
      // Only log if debug is enabled
      if (this.config.debug) {
        console.log('DEBUG - Starting fetchFeatureLimitForUser with:', { userId, featureName })
      }

      if (!userId || !featureName) {
        throwError(
          ErrorCodes.USAGE_INVALID_PARAMS,
          'userId and featureName are required',
          { userId, featureName }
        )
      }

      // First get user's profile from profiles
      if (this.config.debug) {
        console.log('DEBUG - Fetching profile from Supabase')
      }
      
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // Log EVERY step if debug is enabled
      if (this.config.debug) {
        console.log('DEBUG - After profile fetch, before plan check')
        console.log('DEBUG - Profile object:', {
          hasProfile: !!profile,
          stripePriceId: profile?.stripe_price_id,
          profileKeys: profile ? Object.keys(profile) : []
        })
      }

      try {
        // Now try the user_plans table check
        if (this.config.debug) {
          console.log('DEBUG - Starting user_plans check')
          console.log('DEBUG - Supabase client check:', {
            hasClient: !!this.supabase?.client,
            hasFrom: !!this.supabase?.client?.from,
            methods: Object.keys(this.supabase?.client || {})
          })
        }

        // First try to get the table structure
        if (this.config.debug) {
          console.log('DEBUG - Attempting table structure query...')
        }
        const { data: tableInfo, error: tableError } = await this.supabase.client
          .from('user_plans')
          .select('count')

        if (this.config.debug) {
          console.log('DEBUG - Table structure result:', {
            error: tableError,
            exists: !tableError,
            count: tableInfo
          })
        }

        if (tableError) {
          if (this.config.debug) {
            console.log('DEBUG - Table error:', tableError)
          }
          throwError(
            ErrorCodes.USAGE_CONFIG_ERROR,
            'Failed to access user_plans table',
            { 
              error: tableError.message,
              code: tableError.code,
              details: tableError.details,
              hint: tableError.hint
            }
          )
        }

        // First get all plans to see what we have
        if (this.config.debug) {
          console.log('DEBUG - Checking all plans in table...')
        }
        const { data: allPlans, error: allPlansError } = await this.supabase.client
          .from('user_plans')
          .select('*')

        if (this.config.debug) {
          console.log('DEBUG - All plans:', {
            count: allPlans?.length,
            plans: allPlans,
            error: allPlansError
          })
        }

        // Now try the specific price ID
        if (this.config.debug) {
          console.log('DEBUG - Looking up plan:', {
            stripe_price_id: profile.stripe_price_id
          })
        }

        const { data: planData, error: planError } = await this.supabase.client
          .from('user_plans')
          .select('*')
          .eq('stripe_price_id', profile.stripe_price_id)
          .single()

        if (this.config.debug) {
          console.log('DEBUG - Plan lookup result:', {
            found: !!planData,
            error: planError,
            data: planData
          })
        }

        if (!planData) {
          throwError(
            ErrorCodes.USAGE_LIMIT_ERROR,
            'No plan found for user',
            { 
              userId: profile.id,
              stripe_price_id: profile.stripe_price_id,
              table: 'user_plans'
            }
          )
        }

        // Log the profile data we're working with
        this.debug.log('LimitEnforcer', 'Starting feature limit fetch', {
          profile_data: {
            stripe_price_id: profile.stripe_price_id,
            featureName
          }
        })

        // After profile query success
        if (this.config.debug) {
          console.log('DEBUG - Starting user_plans query with:', {
            stripe_price_id: profile.stripe_price_id,
            table: 'user_plans'
          })
        }

        try {
          if (this.config.debug) {
            console.log('DEBUG - Testing user_plans table...')
          }
          
          // First try to get the table structure
          const { data: tableInfo, error: tableError } = await this.supabase.client
            .from('user_plans')
            .select('*')
            .limit(1)

          if (this.config.debug) {
            console.log('DEBUG - user_plans table check:', {
              error: tableError,
              exists: !tableError,
              columns: tableInfo ? Object.keys(tableInfo[0] || {}) : [],
              recordCount: tableInfo?.length || 0
            })
          }

          // Then try the specific price ID
          const { data: planData, error: planError } = await this.supabase.client
            .from('user_plans')
            .select('*')
            .eq('stripe_price_id', profile.stripe_price_id)
            .single()

          if (this.config.debug) {
            console.log('DEBUG - Plan lookup:', {
              stripe_price_id: profile.stripe_price_id,
              found: !!planData,
              error: planError,
              data: planData
            })
          }

          if (!planData) {
            throwError(
              ErrorCodes.USAGE_LIMIT_ERROR,
              'No plan found for user',
              { 
                userId: profile.id,
                stripe_price_id: profile.stripe_price_id,
                table: 'user_plans'
              }
            )
          }

        } catch (error) {
          // Log detailed error information
          if (this.config.debug) {
            console.error('Database Operation Failed:', {
              error: {
                name: error.name,
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
              },
              context: {
                table: 'user_plans',
                operation: 'select',
                params: {
                  stripe_price_id: profile.stripe_price_id
                }
              },
              supabaseClient: {
                exists: !!this.supabase?.client,
                methods: Object.keys(this.supabase?.client || {})
              }
            })
          }
          
          throwError(
            ErrorCodes.USAGE_CONFIG_ERROR,
            `Database operation failed: ${error.message}`,
            { 
              originalError: error.message,
              code: error.code,
              details: error.details || {},
              hint: error.hint || null,
              table: 'user_plans',
              clientStatus: !!this.supabase?.client,
              operation: 'select',
              params: {
                stripe_price_id: profile.stripe_price_id
              }
            }
          )
        }

        // Force log the plan we found
        if (this.config.debug) {
          console.log('DEBUG - Found user plan:', planData)
        }

        // Get the feature limit using the correct plan ID
        const { data: featureLimit, error: limitError } = await this.supabase.client
          .from(this.config.usageFeatureLimitsTable)
          .select('*')
          .eq('plan_id', planData.id)
          .eq('feature_name', featureName)
          .single()

        // FORCE log the feature limits query result
        if (this.config.debug) {
          console.log('DEBUG - Feature limits query result:', {
            success: !limitError,
            hasData: !!featureLimit,
            error: limitError,
            query: {
              planId: planData.id,
              featureName,
              table: this.config.usageFeatureLimitsTable
            }
          })
        }

        if (limitError) {
          this.debug.error('LimitEnforcer', 'Failed to fetch feature limit', {
            planId: planData.id,
            featureName,
            error: limitError
          })
          throwError(
            ErrorCodes.USAGE_CONFIG_ERROR,
            'Failed to fetch feature limit',
            { 
              planId: planData.id,
              featureName,
              originalError: limitError.message,
              code: limitError.code,
              table: this.config.usageFeatureLimitsTable
            }
          )
        }

        let finalLimit = featureLimit?.limit_value || null

        // Only try adjustments if enabled and adjustment instance exists
        if (this.config.enableUserAdjustments && this.adjustment && finalLimit !== null) {
          try {
            const adjustment = await this.adjustment.getActiveAdjustments({
              userId,
              featureName
            })
            finalLimit += adjustment
          } catch (adjustError) {
            throwError(
              ErrorCodes.USAGE_ADJUSTMENT_ERROR,
              'Failed to apply limit adjustments',
              {
                userId,
                featureName,
                baseLimit: finalLimit,
                originalError: adjustError.message
              }
            )
          }
        }

        return finalLimit

      } catch (dbError) {
        // Catch any other database errors
        throwError(
          ErrorCodes.USAGE_CONFIG_ERROR,
          'Database operation failed',
          { 
            originalError: dbError.message,
            code: dbError.code,
            details: dbError.details || {},
            hint: dbError.hint || null
          }
        )
      }

    } catch (error) {
      this.debug.error('LimitEnforcer', 'Failed to fetch feature limit', error)
      throw error
    }
  }
}