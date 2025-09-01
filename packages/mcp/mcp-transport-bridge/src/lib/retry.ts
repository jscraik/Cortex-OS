/**
 * Exponential backoff retry helper.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries, timeout }: { retries: number; timeout: number },
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = Math.min(timeout * 2 ** attempt, 30000);
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown error');
}
