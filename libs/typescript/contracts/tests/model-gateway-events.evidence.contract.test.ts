import { describe, expect, it } from 'vitest';
import { evidenceItemSchema } from '../src/evidence.js';
import { ModelErrorEventSchema, ModelResponseEventSchema } from '../src/model-gateway-events.js';

// NOTE: Test added first (TDD) – will fail until schemas extended with optional evidence array

const sampleEvidence = [
	{
		text: 'console.log("hello")',
		kind: 'code',
		hash: 'a'.repeat(64),
		timestamp: new Date().toISOString(),
	},
];

describe('contract:model-gateway-events evidence extension', () => {
	it('accepts evidence on model response event', () => {
		const eventData = {
			requestId: 'req-123',
			model: 'mlx:phi-3',
			provider: 'mlx',
			latency: 123,
			completedAt: new Date().toISOString(),
			evidence: sampleEvidence,
		};
		const parsed = ModelResponseEventSchema.safeParse(eventData);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.evidence?.length).toBe(1);
		}
	});

	it('accepts evidence on model error event', () => {
		const eventData = {
			requestId: 'req-err',
			model: 'mlx:phi-3',
			provider: 'mlx',
			error: 'Rate limit',
			failedAt: new Date().toISOString(),
			evidence: sampleEvidence,
		};
		const parsed = ModelErrorEventSchema.safeParse(eventData);
		expect(parsed.success).toBe(true);
	});

	it('rejects invalid evidence item missing text and uri', () => {
		const badEvidence = [{ kind: 'code', hash: 'b'.repeat(64) } as unknown];
		const eventData = {
			requestId: 'req-125',
			model: 'mlx:phi-3',
			provider: 'mlx',
			latency: 50,
			completedAt: new Date().toISOString(),
			evidence: badEvidence,
		};
		const parsed = ModelResponseEventSchema.safeParse(eventData);
		expect(parsed.success).toBe(false);
	});

	it('valid evidence item shape (independent)', () => {
		const parsed = evidenceItemSchema.parse(sampleEvidence[0]);
		expect(parsed.kind).toBe('code');
	});
});
