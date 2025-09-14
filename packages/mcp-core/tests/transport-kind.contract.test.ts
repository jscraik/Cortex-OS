import { describe, expect, it } from 'vitest';
import { TransportKindSchema } from '../src/contracts.js';

describe('TransportKind contract', () => {
	it('accepts declared transport kinds', () => {
		for (const kind of [
			'stdio',
			'http',
			'sse',
			'ws',
			'streamableHttp',
		] as const) {
			expect(TransportKindSchema.parse(kind)).toBe(kind);
		}
	});

	it('rejects unknown transport kinds', () => {
		expect(() => TransportKindSchema.parse('invalid-kind')).toThrow();
	});
});
