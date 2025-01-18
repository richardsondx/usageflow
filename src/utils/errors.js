export class UsageFlowError extends Error {
  constructor(code, message, details = {}) {
    const fullMessage = `${message} (Code: ${code}) - Details: ${JSON.stringify(details, null, 2)}`
    super(fullMessage)
    this.code = code
    this.details = details
    this.name = 'UsageFlowError'
  }
}

export const ErrorCodes = {
  USAGE_INVALID_PARAMS: 'USAGE_INVALID_PARAMS',
  USAGE_CONFIG_ERROR: 'USAGE_CONFIG_ERROR',
  USAGE_LIMIT_ERROR: 'USAGE_LIMIT_ERROR',
  USAGE_ADJUSTMENT_ERROR: 'USAGE_ADJUSTMENT_ERROR'
}

export function throwError(code, message, details = {}) {
  console.error('UsageFlow Error:', {
    code,
    message,
    details
  })
  throw new UsageFlowError(code, message, details)
} 