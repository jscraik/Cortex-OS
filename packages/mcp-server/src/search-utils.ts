import type { MemoryProvider, MemorySearchResult } from '@cortex-os/memory-core';
import type { MemorySearchInput } from '@cortex-os/tool-spec';

export type LocalHybridSearchOptions = {
	limit?: number;
	offset?: number;
	scoreThreshold?: number;
	hybridWeight?: number;
	sessionFilterMode?: MemorySearchInput['session_filter_mode'];
};

const DEFAULT_SESSION_FILTER: MemorySearchInput['session_filter_mode'] = 'all';

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
		sessionFilterMode = DEFAULT_SESSION_FILTER,
	} = options;

	return provider.search({
		query,
		search_type: 'hybrid',
		limit,
		offset,
		session_filter_mode: sessionFilterMode,
		score_threshold: scoreThreshold,
		hybrid_weight: hybridWeight,
	});
};
