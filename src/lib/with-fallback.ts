export async function withFallback<M, R>(
  primary: M,
  fallbacks: M[],
  executor: (model: M) => Promise<R>,
  onError?: (model: M, error: unknown) => void,
): Promise<R> {
  let lastError: unknown;
  try {
    return await executor(primary);
  } catch (err) {
    lastError = err;
    onError?.(primary, err);
  }
  for (const fb of fallbacks) {
    try {
      return await executor(fb);
    } catch (err) {
      lastError = err;
      onError?.(fb, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All fallbacks failed');
}
