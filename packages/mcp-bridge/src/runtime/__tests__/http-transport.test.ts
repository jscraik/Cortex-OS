import { describe, expect, it } from 'vitest';
import { sanitizeHeaders } from '../transport/http-transport.js';

describe('http-transport helpers', () => {
	it('removes host header when sanitizing', () => {
		const headers = {
			host: 'example.com',
			authorization: 'Bearer token',
			'x-custom': 'foo',
		};

		const result = sanitizeHeaders(headers);

		expect(result).not.toHaveProperty('host');
		expect(result.authorization).toBe('Bearer token');
		expect(result['x-custom']).toBe('foo');
	});

	it('keeps multi-value headers intact', () => {
		const headers = {
			accept: 'application/json, text/plain',
		};

		const result = sanitizeHeaders(headers);
		expect(result.accept).toBe('application/json, text/plain');
	});
});
