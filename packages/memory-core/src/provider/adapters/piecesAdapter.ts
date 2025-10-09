import { createTimeout, withCircuitBreaker } from '@cortex-os/utils';
import type { MemoryProvider, SearchMemoryInput, SearchMemoryResult } from '../MemoryProvider.js';

const PIECES_MCP_ENABLED = process.env.PIECES_MCP_ENABLED === 'true';
const PIECES_BASE_URL = process.env.PIECES_BASE_URL || 'http://localhost:39300';

async function searchPieces(
	input: SearchMemoryInput,
	signal?: AbortSignal,
): Promise<SearchMemoryResult> {
	if (!PIECES_MCP_ENABLED) {
		return { hits: [], tookMs: 0 };
	}

	const url = `${PIECES_BASE_URL}/search`;
	const { race, cancel } = createTimeout(5000);
	if (signal) {
		signal.addEventListener('abort', cancel);
	}

	try {
		const response = await race(
			fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
				signal,
			}),
		);

		if (!response.ok) {
			throw new Error(`Pieces search failed with status: ${response.status}`);
		}

		const results = await response.json();
		return {
			...results,
			hits: results.hits.map((hit: any) => ({ ...hit, source: 'pieces' })),
		};
	} finally {
		if (signal) {
			signal.removeEventListener('abort', cancel);
		}
	}
}

export function withPiecesSearch(provider: MemoryProvider): MemoryProvider {
	if (!PIECES_MCP_ENABLED) {
		return provider;
	}

	const originalSearch = provider.search.bind(provider);
	const searchWithBreaker = withCircuitBreaker(searchPieces, { name: 'piecesSearch' });

	provider.search = async (
		input: SearchMemoryInput,
		signal?: AbortSignal,
	): Promise<SearchMemoryResult> => {
		const localResults = await originalSearch(input, signal);
		const piecesResults = await searchWithBreaker(input, signal);

		return {
			hits: [...localResults.hits, ...piecesResults.hits],
			tookMs: localResults.tookMs + piecesResults.tookMs,
		};
	};

	return provider;
}
