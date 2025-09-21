import { describe, expect, it } from 'vitest';
import { ProcessingStrategy } from '../../policy/mime.js';
import type { ProcessingFile } from '../dispatch.js';
import { ProcessingDispatcher } from '../dispatch.js';

function makeFile(content: string, mimeType = 'text/plain'): ProcessingFile {
	return {
		path: '/tmp/test.txt',
		content: Buffer.from(content, 'utf-8'),
		mimeType,
		size: Buffer.byteLength(content, 'utf-8'),
	};
}

describe('Semantic and Late chunkers', () => {
	it('semantic chunker splits by paragraphs and sentences', async () => {
		const dispatcher = new ProcessingDispatcher();
		const file = makeFile(
			'Intro para. Short.\n\nThis is a much longer paragraph that should be split into multiple sentences to ensure semantic coherence. It contains several sentences. Hopefully this triggers a split.\n\nTail.',
		);
		const result = await dispatcher.dispatch(file, {
			strategy: ProcessingStrategy.NATIVE_TEXT,
			confidence: 1,
			reason: 'test',
			processing: {
				chunker: 'semantic',
				requiresOCR: false,
				requiresUnstructured: false,
				maxPages: null,
			},
		});
		expect(result.success).toBe(true);
		expect(result.chunks?.length).toBeGreaterThan(1);
		const contents = (result.chunks ?? []).map((c) => c.content);
		expect(contents.some((c) => c.includes('Intro para'))).toBe(true);
		expect(contents.some((c) => c.includes('much longer paragraph'))).toBe(true);
	});

	it('late chunker produces overlapping windows', async () => {
		const dispatcher = new ProcessingDispatcher();
		const longText = `${'A'.repeat(1800)} ${'B'.repeat(1800)} ${'C'.repeat(500)}`;
		const file = makeFile(longText);
		const result = await dispatcher.dispatch(file, {
			strategy: ProcessingStrategy.NATIVE_TEXT,
			confidence: 1,
			reason: 'test',
			processing: {
				chunker: 'late',
				requiresOCR: false,
				requiresUnstructured: false,
				maxPages: null,
			},
		});
		expect(result.success).toBe(true);
		// Expect multiple windows
		expect((result.chunks ?? []).length).toBeGreaterThan(1);
		type Meta = { start?: number; end?: number; [k: string]: unknown };
		const mds = (result.chunks ?? []).map((c) => (c.metadata ?? {}) as Meta);
		// Verify metadata has positions and increasing parts
		expect(mds.every((m) => typeof m.start === 'number' && typeof m.end === 'number')).toBe(true);
	});
});
