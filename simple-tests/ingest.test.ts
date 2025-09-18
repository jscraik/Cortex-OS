import { describe, expect, it } from 'vitest';
import { ingest } from '../src/lib/ingest';

describe('ingest validation', () => {
	it('parses valid input', () => {
		const result = ingest({ source: 'mem://doc', text: 'hello' });
		expect(result).toEqual({ source: 'mem://doc', text: 'hello' });
	});

	it('throws on invalid input', () => {
		expect(() => ingest({ source: '', text: '' })).toThrow(/Invalid ingest input/);
	});
});
