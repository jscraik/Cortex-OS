// Type-only stub for micromatch using lazy dynamic import to avoid CJS require.
type IsMatch = (
	str: string,
	patterns: string | string[],
	options?: Record<string, unknown>,
) => boolean;

interface MicromatchModule {
	isMatch: IsMatch;
}
let cached: MicromatchModule | null = null;

async function load() {
	if (!cached) {
		const mod: MicromatchModule = await import('micromatch');
		cached = { isMatch: mod.isMatch };
	}
	return cached;
}

// Wrapper exposed as synchronous-looking API; resolves lazily if already loaded.
export const isMatch: IsMatch = (str, patterns, options) => {
	if (cached) return cached.isMatch(str, patterns, options);
	// Not yet loaded: this introduces an async boundary; throw instructional error.
	throw new Error(
		'micromatch not yet loaded - call preloadMicromatch() early in lifecycle',
	);
};

export async function preloadMicromatch() {
	await load();
}

export default { isMatch, preloadMicromatch };
