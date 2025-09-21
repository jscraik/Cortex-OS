import type { ProcessingConfig } from '../policy/mime.js';
import type { Chunker, DocumentChunk, ProcessingFile } from './dispatch.js';

/**
 * LateChunker
 *
 * Produces larger overlapping windows to support late fusion strategies.
 * Windowing operates on characters with a default window size and overlap.
 */
export class LateChunker implements Chunker {
	constructor(
		private readonly windowSize = 1600,
		private readonly overlap = 200,
	) {}

	async chunk(file: ProcessingFile, _config: ProcessingConfig): Promise<DocumentChunk[]> {
		// reference parameter to avoid unused warning
		const _unused = _config; // eslint-disable-line @typescript-eslint/no-unused-vars
		const text = file.content.toString('utf-8');
		const chunks: DocumentChunk[] = [];
		if (!text.trim()) return chunks;

		const size = Math.max(200, this.windowSize);
		const ov = Math.max(0, Math.min(this.overlap, Math.floor(size / 2)));

		let start = 0;
		let part = 0;
		while (start < text.length) {
			const end = Math.min(text.length, start + size);
			const slice = text.slice(start, end).trim();
			if (slice) {
				part += 1;
				chunks.push({
					id: `${file.path}-late-${part}`,
					content: slice,
					metadata: { type: 'late_window', part, start, end },
				});
			}
			if (end >= text.length) break;
			start = end - ov; // overlap
		}

		return chunks;
	}
}
