import type { Chunk } from '../lib/types.js';

export interface FreshnessOptions {
	epsilon?: number; // score tie-break threshold
	cacheThresholdMs?: number; // consider content "fresh" if updated within this timeframe
	preferCache?: boolean; // prefer cached (older) content for consistency
}

// Sorts primarily by score desc; when within epsilon, prefer newer updatedAt
export function routeByFreshness<T extends Chunk & { score?: number }>(
	chunks: readonly T[],
	opts: FreshnessOptions = {},
): T[] {
	const {
		epsilon = 0.02,
		cacheThresholdMs = 30 * 60 * 1000, // 30 minutes default
		preferCache = false
	} = opts;

	if (!Array.isArray(chunks) || chunks.length <= 1) return chunks.slice();

	const now = Date.now();

	return chunks.slice().sort((a, b) => {
		const as = a.score ?? 0;
		const bs = b.score ?? 0;
		const diff = bs - as;

		// If score difference is significant, prioritize score
		if (Math.abs(diff) > epsilon) {
			return diff; // score decides
		}

		// Within epsilon, apply freshness/cache strategy
		const au = a.updatedAt ?? -Infinity;
		const bu = b.updatedAt ?? -Infinity;

		// Check if content is considered "fresh"
		const aIsFresh = (now - au) < cacheThresholdMs;
		const bIsFresh = (now - bu) < cacheThresholdMs;

		if (preferCache) {
			// Prefer cached (older) content when scores are similar
			if (aIsFresh !== bIsFresh) {
				return aIsFresh ? 1 : -1; // non-fresh (cached) first
			}
			// If both same freshness status, prefer older
			return au - bu;
		} else {
			// Default: prefer fresh content
			if (aIsFresh !== bIsFresh) {
				return bIsFresh ? 1 : -1; // fresh first
			}
			// If both same freshness status, prefer newer
			return bu - au;
		}
	});
}

export function routeByCache<T extends Chunk & { score?: number }>(
	chunks: readonly T[],
	cacheThresholdMs = 30 * 60 * 1000
): T[] {
	return routeByFreshness(chunks, {
		epsilon: 0.05,
		cacheThresholdMs,
		preferCache: true,
	});
}

export function routeByLive<T extends Chunk & { score?: number }>(
	chunks: readonly T[],
	freshnessThresholdMs = 5 * 60 * 1000
): T[] {
	return routeByFreshness(chunks, {
		epsilon: 0.03,
		cacheThresholdMs: freshnessThresholdMs,
		preferCache: false,
	});
}

