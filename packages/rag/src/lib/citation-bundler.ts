import type { Chunk, CitationBundle } from './types.js';

export class CitationBundler {
	bundle(chunks: Array<Chunk & { score?: number }>): CitationBundle {
		const citations = chunks.map((c) => ({
			id: c.id,
			source: c.source,
			text: c.text,
			score: c.score,
		}));
		const text = chunks.map((c) => c.text).join('\n');
		return { text, citations };
	}
}
