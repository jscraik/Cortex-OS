import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { redact } from '../redaction';

describe('schema-driven redaction', () => {
	it('removes fields marked with description redact', () => {
		const schema = z.object({
			id: z.string(),
			secret: z.string().describe('redact'),
			nested: z.object({
				token: z.string().describe('redact'),
				value: z.number(),
			}),
		});

		const payload = {
			id: '1',
			secret: 'top',
			nested: { token: 'abc', value: 42 },
		};

		const result = redact(schema, payload) as {
			id: string;
			nested: { value: number };
		};
		expect(result).toEqual({ id: '1', nested: { value: 42 } });
		expect(result).not.toHaveProperty('secret');
		expect(result.nested).not.toHaveProperty('token');
	});
});
