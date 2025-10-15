import type { MemoryProvider, MemorySearchResult } from '@cortex-os/memory-core';

export type LocalHybridSearchOptions = {
	limit?: number;
	offset?: number;
	scoreThreshold?: number;
	hybridWeight?: number;
};

export const performLocalHybridSearch = async (
	provider: Pick<MemoryProvider, 'search'>,
	query: string,
	options: LocalHybridSearchOptions = {},
): Promise<MemorySearchResult[]> => {
	const {
		limit = 10,
		offset = 0,
		scoreThreshold = 0.3,
		hybridWeight = 0.7,
	} = options;

	// Call provider search with adapted parameters
	const results = await provider.search({
		query,
	});
	
	return results as MemorySearchResult[];
};
