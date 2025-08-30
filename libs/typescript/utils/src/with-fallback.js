/**
 * Utility for implementing fallback patterns with async operations
 */
/**
 * Executes providers in order until one succeeds or all fail
 *
 * @param providers Array of providers to try in order
 * @param options Configuration options
 * @returns Result from the first successful provider
 * @throws Error if all providers fail
 */
export async function withFallback(providers, options = {}) {
    const { logWarnings = true, errorMessage } = options;
    if (providers.length === 0) {
        throw new Error('No providers available');
    }
    let lastError;
    for (const provider of providers) {
        try {
            return await provider.execute();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (logWarnings) {
                console.warn(`Provider ${provider.name} failed:`, lastError.message);
            }
        }
    }
    const message = errorMessage ||
        `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`;
    throw new Error(message);
}
/**
 * Creates a fallback provider from a function
 */
export function createProvider(name, execute) {
    return { name, execute };
}
//# sourceMappingURL=with-fallback.js.map