/**
 * Utility for implementing fallback patterns with async operations
 */

export interface FallbackProvider<T> {
	name: string;
	execute: () => Promise<T>;
}

export interface FallbackOptions {
	/**
	 * Whether to log warnings when providers fail
	 */
	logWarnings?: boolean;
	/**
	 * Custom error message when all providers fail
	 */
	errorMessage?: string;
}

/**
 * Executes providers in order until one succeeds or all fail
 *
 * @param providers Array of providers to try in order
 * @param options Configuration options
 * @returns Result from the first successful provider
 * @throws Error if all providers fail
 */
export async function withFallback<T>(
	providers: FallbackProvider<T>[],
	options: FallbackOptions = {},
): Promise<T> {
	const { logWarnings = true, errorMessage } = options;

	if (providers.length === 0) {
		throw new Error('No providers available');
	}

	let lastError: Error | undefined;

	for (const provider of providers) {
		try {
			return await provider.execute();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (logWarnings) {
				console.warn(`Provider ${provider.name} failed:`, lastError.message);
			}
		}
	}

	const message =
		errorMessage ||
		`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`;

	throw new Error(message);
}

/**
 * Creates a fallback provider from a function
 */
export function createProvider<T>(
	name: string,
	execute: () => Promise<T>,
): FallbackProvider<T> {
	return { name, execute };
}
