import { legacyMemoryAdapterRemoved } from '../legacy.js';

export interface HybridSearchOptions {
	textQuery?: string;
	vectorQuery?: number[];
	alpha?: number;
	limit?: number;
	kind?: string;
	threshold?: number;
	recencyBoost?: boolean;
	recencyHalfLife?: number;
}

export interface SearchResult {
	score?: number;
}

const removed = () => legacyMemoryAdapterRemoved('HybridSearch');

export class HybridSearch {
	constructor(..._args: unknown[]) {
		removed();
	}

	async search(_options: HybridSearchOptions): Promise<never> {
		removed();
	}
}

export const HYBRID_SEARCH_REMOVED = true;
