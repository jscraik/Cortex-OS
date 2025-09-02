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
export declare function withFallback<T>(
	providers: FallbackProvider<T>[],
	options?: FallbackOptions,
): Promise<T>;
/**
 * Creates a fallback provider from a function
 */
export declare function createProvider<T>(
	name: string,
	execute: () => Promise<T>,
): FallbackProvider<T>;
//# sourceMappingURL=with-fallback.d.ts.map
