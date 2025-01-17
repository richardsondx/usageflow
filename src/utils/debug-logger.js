export class DebugLogger {
  constructor(isEnabled = false) {
    this.isEnabled = isEnabled
  }

  log(module, message, data = null) {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      module,
      message,
      ...(data && { data })
    }

    console.log(`[UsageFlow Debug] ${JSON.stringify(logData, null, 2)}`)
  }

  error(module, message, error = null) {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      module,
      message,
      ...(error && { 
        error: {
          message: error.message,
          stack: error.stack
        }
      })
    }

    console.error(`[UsageFlow Error] ${JSON.stringify(logData, null, 2)}`)
  }
} 