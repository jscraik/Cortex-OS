import { describe, expect, it } from 'vitest';
import type { ProcessingFile } from '../src/chunkers/dispatch.js';
import {
	type HierarchicalChunk,
	HierarchicalChunker,
} from '../src/chunkers/hierarchical-chunker.js';

function makeFile(content: string): ProcessingFile {
	return {
		path: 'doc/test.md',
		content: Buffer.from(content, 'utf-8'),
		mimeType: 'text/markdown',
		size: content.length,
	};
}

describe('HierarchicalChunker', () => {
	it('creates document, section, and paragraph levels with parent-child relationships', async () => {
		const content = `# Title\n\nIntro paragraph.\n\n## Section A\nParagraph one.\n\nParagraph two.\n\n## Section B\nAnother paragraph.`;
		const file = makeFile(content);
		const chunker = new HierarchicalChunker();

		const chunks = (await chunker.chunk(file, {
			chunker: 'hierarchical',
			requiresOCR: false,
			requiresUnstructured: false,
			maxPages: null,
		})) as HierarchicalChunk[];

		// One document chunk exists
		const doc = chunks.find((c) => c.level === 'document');
		expect(doc).toBeDefined();
		const docChildren = Array.isArray(doc?.childrenIds) ? doc?.childrenIds : [];
		expect(Array.isArray(docChildren)).toBe(true);

		// Section level chunks
		const sections = chunks.filter((c) => c.level === 'section');
		expect(sections.length).toBeGreaterThan(0);
		for (const s of sections) {
			expect(s.parentId).toBe(doc?.id);
			expect(Array.isArray(s.childrenIds)).toBe(true);
		}

		// Paragraph level chunks
		const paras = chunks.filter((c) => c.level === 'paragraph');
		expect(paras.length).toBeGreaterThan(0);

		// Parent-child links consistency
		const sectionIds = sections.map((s) => s.id);
		for (const cid of docChildren) {
			expect(sectionIds).toContain(cid);
		}
		for (const s of sections) {
			const childParas = paras.filter((p) => p.parentId === s.id).map((p) => p.id);
			const sc = Array.isArray(s.childrenIds) ? s.childrenIds : [];
			for (const pid of sc) {
				expect(childParas).toContain(pid);
			}
		}
	});
});
