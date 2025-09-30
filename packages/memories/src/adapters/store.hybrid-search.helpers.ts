import type { Memory } from '../domain/types.js';
import type { HybridQuery, HybridSearchResult } from './store.hybrid-search.js';

export function applyFilters(query: HybridQuery, memories: Memory[]): Memory[] {
	if (!query.filters) return memories;
	const { metadata } = query.filters;
	if (!metadata) return memories;

	return memories.filter((m) => {
		for (const [k, v] of Object.entries(metadata)) {
			if (m.metadata?.[k] !== v) return false;
		}
		return true;
	});
}

export function computeTextHybrid(query: HybridQuery, memories: Memory[]): HybridSearchResult[] {
	const q = (query.text || '').toLowerCase();
	return memories
		.map(
			(m) =>
				({
					...m,
					score: m.text?.toLowerCase().includes(q) ? 1 : 0,
				}) as HybridSearchResult,
		)
		.sort((a, b) => b.score - a.score);
}

export function computeVectorHybrid(query: HybridQuery, memories: Memory[]): HybridSearchResult[] {
	const vec = query.vector || [];
	if (vec.length === 0) return [];

	// Simple dot-product similarity for placeholder
	return memories
		.map((m) => {
			const memoryVec = Array.isArray(m.vector)
				? m.vector
				: (m as unknown as { embedding?: number[] }).embedding;
			const score =
				Array.isArray(memoryVec) && memoryVec.length === vec.length
					? memoryVec.reduce((acc, val, i) => acc + val * (vec[i] || 0), 0)
					: 0;
			return { ...m, score } as HybridSearchResult;
		})
		.sort((a, b) => b.score - a.score);
}
