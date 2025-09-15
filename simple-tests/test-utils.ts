/**
 * Test utilities for async waiting and timing
 */

/**
 * Wait for a condition to become true within a timeout period
 * @param condition Function that returns true when condition is met
 * @param timeoutMs Maximum time to wait in milliseconds
 * @param intervalMs How often to check the condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 50
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(intervalMs);
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
