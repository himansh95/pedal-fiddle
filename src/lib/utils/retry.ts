/**
 * Retries an async function up to `maxAttempts` times with exponential back-off.
 * Non-retryable errors (e.g. 4xx) should be thrown with `retryable: false` on the error object.
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export class NonRetryableError extends Error {
  retryable = false as const;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

function isNonRetryable(err: unknown): boolean {
  return (
    err instanceof NonRetryableError ||
    (typeof err === 'object' && err !== null && (err as { retryable?: boolean }).retryable === false)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 10_000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (isNonRetryable(err) || attempt === maxAttempts) {
        throw err;
      }

      onRetry?.(attempt, err);
      await sleep(Math.min(delay, maxDelayMs));
      delay *= factor;
    }
  }

  throw lastError;
}
