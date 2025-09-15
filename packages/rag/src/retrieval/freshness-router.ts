import type { Chunk } from '../lib/types.js';

export interface FreshnessOptions {
	epsilon?: number; // score tie-break threshold
}

// Sorts primarily by score desc; when within epsilon, prefer newer updatedAt
export function routeByFreshness<T extends Chunk & { score?: number }>(
	chunks: readonly T[],
	opts: FreshnessOptions = {},
): T[] {
	const { epsilon = 0.02 } = opts;
	if (!Array.isArray(chunks) || chunks.length <= 1) return chunks.slice();
	return chunks.slice().sort((a, b) => {
		const as = a.score ?? 0;
		const bs = b.score ?? 0;
		const diff = bs - as;
		if (Math.abs(diff) > epsilon) {
			return diff; // score decides
		}
		const au = a.updatedAt ?? -Infinity;
		const bu = b.updatedAt ?? -Infinity;
		// newer first
		if (bu !== au) return bu - au;
		// stable fallback: keep original relative order (stable sort in modern V8)
		return 0;
	});
}

export default routeByFreshness;
