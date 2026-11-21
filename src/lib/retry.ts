export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "shouldRetry">> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options }
  const shouldRetry = options.shouldRetry ?? isRetryableError

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err
      }
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs))
    }
  }
  throw lastError
}

function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt - 1)
  const jitter = Math.random() * baseMs
  return Math.min(exponential + jitter, maxMs)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset")) {
      return true
    }
    // 5xx status codes embedded in error messages are retryable; 4xx are not
    const statusMatch = msg.match(/\b(5\d{2})\b/)
    if (statusMatch) return true
  }
  return false
}
