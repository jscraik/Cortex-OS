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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        if (signal) {
                signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        try {
                const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(input),
                        signal: controller.signal,
                });

                if (!response.ok) {
                        throw new Error(`Pieces search failed with status: ${response.status}`);
                }

                const results = await response.json();
                return {
                        ...results,
                        hits: results.hits.map((hit: any) => ({ ...hit, source: 'pieces' })),
                };
        } finally {
                clearTimeout(timeout);
        }
}

export function withPiecesSearch(provider: MemoryProvider): MemoryProvider {
        if (!PIECES_MCP_ENABLED) {
                return provider;
        }

        const originalSearch = provider.search.bind(provider);

        provider.search = async (
                input: SearchMemoryInput,
                signal?: AbortSignal,
        ): Promise<SearchMemoryResult> => {
                const localResults = await originalSearch(input, signal);
                const piecesResults = await searchPieces(input, signal);

		return {
			hits: [...localResults.hits, ...piecesResults.hits],
			tookMs: localResults.tookMs + piecesResults.tookMs,
		};
	};

	return provider;
}
