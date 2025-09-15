import { describe, expect, it } from 'vitest';
import { z } from 'zod';
// TDD: This import will fail until evidence schema is implemented
// Implementation target: ../src/evidence.ts exporting evidenceItemSchema & evidenceArraySchema
import { evidenceArraySchema, evidenceItemSchema } from '../src/evidence';

describe('contract: evidence schema', () => {
	it('validates a minimal evidence item with text', () => {
		const item = { text: 'Paragraph about topic X' };
		const parsed = evidenceItemSchema.parse(item);
		expect(parsed.text).toBe('Paragraph about topic X');
	});

	it('validates evidence array preserves order', () => {
		const items = [
			{ id: 'a', text: 'First' },
			{ id: 'b', uri: 'https://example.com/doc' },
		];
		const parsed = evidenceArraySchema.parse(items);
		expect(parsed.map((i) => i.id)).toEqual(['a', 'b']);
	});

	it('rejects item missing both text and uri', () => {
		expect(() => evidenceItemSchema.parse({})).toThrow();
	});

	it('enforces max array length ( > 50 fails )', () => {
		const over = Array.from({ length: 51 }, (_, i) => ({ text: `T${i}` }));
		expect(() => evidenceArraySchema.parse(over)).toThrow();
	});

	it('validates offset pairs and rejects invalid ranges', () => {
		const good = evidenceItemSchema.parse({
			text: 'abc',
			startOffset: 0,
			endOffset: 3,
		});
		expect(good.endOffset).toBe(3);
		expect(() =>
			evidenceItemSchema.parse({ text: 'x', startOffset: 5 }),
		).toThrow();
		expect(() =>
			evidenceItemSchema.parse({ text: 'x', startOffset: 5, endOffset: 4 }),
		).toThrow();
	});

	it('round-trips inside a synthetic CloudEvent-like envelope', () => {
		const evidence = [
			{ id: 'c1', text: 'Claim support', score: 0.9 },
			{ id: 'c2', uri: 'https://repo/doc#L10', kind: 'code' },
		];
		const EnvelopeLike = z.object({
			id: z.string(),
			type: z.string(),
			source: z.string(),
			specversion: z.literal('1.0'),
			data: z.object({ evidence: evidenceArraySchema }),
		});
		const env = {
			id: '123',
			type: 'demo.evidence.test',
			source: 'https://test',
			specversion: '1.0' as const,
			data: { evidence },
		};
		const parsed = EnvelopeLike.parse(env);
		expect(parsed.data.evidence[0].id).toBe('c1');
	});
});
