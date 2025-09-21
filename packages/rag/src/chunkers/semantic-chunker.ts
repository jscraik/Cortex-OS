import type { ProcessingConfig } from '../policy/mime.js';
import type { Chunker, DocumentChunk, ProcessingFile } from './dispatch.js';

/**
 * SemanticChunker
 *
 * Heuristic semantic chunker that prefers paragraph and sentence boundaries.
 * It splits on blank lines to preserve paragraphs, then merges small paragraphs
 * and optionally splits long ones on sentence endings.
 */
export class SemanticChunker implements Chunker {
	async chunk(file: ProcessingFile, _config: ProcessingConfig): Promise<DocumentChunk[]> {
		// reference parameter to avoid unused warning (config hooks may be added later)
		const _unused = _config; // eslint-disable-line @typescript-eslint/no-unused-vars
		const text = file.content.toString('utf-8');
		const paragraphs = splitIntoParagraphs(text);
		const chunks: DocumentChunk[] = [];

		// Tuned heuristics: smaller min to merge brief intros; lower max to split long paragraphs
		const maxLen = 500; // soft cap per chunk
		const minLen = 120; // small paragraph merge target

		let buffer = '';
		let part = 0;

		const flushBuffer = () => {
			if (!buffer.trim()) return;
			part += 1;
			chunks.push(toChunk(file.path, part, buffer.trim()));
			buffer = '';
		};

		for (const para of paragraphs) {
			if (para.length < minLen) {
				buffer = mergeSmall(buffer, para);
				// If next chunk would exceed max, flush now to avoid giant merges
				if (buffer.length >= minLen) flushBuffer();
				continue;
			}

			flushBuffer(); // commit any pending small paragraphs

			if (para.length <= maxLen) {
				part += 1;
				chunks.push(toChunk(file.path, part, para));
				continue;
			}

			const pieces = splitLongParagraph(para, maxLen);
			for (const piece of pieces) {
				part += 1;
				chunks.push(toChunk(file.path, part, piece));
			}
		}

		flushBuffer();
		return chunks;
	}
}

function splitIntoParagraphs(text: string): string[] {
	return text
		.split(/\r?\n\s*\r?\n/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}

function mergeSmall(buffer: string, para: string): string {
	return buffer ? `${buffer}\n\n${para}` : para;
}

function splitLongParagraph(para: string, maxLen: number): string[] {
	const sentences = para.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
	const out: string[] = [];
	let cur = '';
	for (const s of sentences) {
		const next = cur ? `${cur} ${s}` : s;
		if (next.length > maxLen && cur) {
			out.push(cur.trim());
			cur = s;
		} else {
			cur = next;
		}
	}
	if (cur.trim()) out.push(cur.trim());
	return out;
}

function toChunk(path: string, part: number, content: string): DocumentChunk {
	return {
		id: `${path}-semantic-${part}`,
		content,
		metadata: { type: 'semantic', part },
	};
}
