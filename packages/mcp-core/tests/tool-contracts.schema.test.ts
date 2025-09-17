import { describe, expect, it } from 'vitest';
import {
	toolErrorSchema,
	toolRequestSchema,
	toolResponseSchema,
} from '../src/tool-schemas.js';
import {
	validateToolErrorResponse,
	validateToolRequest,
	validateToolResponse,
} from '../src/validation.js';

describe('tool request schema', () => {
	it('exposes JSON Schema metadata', () => {
		expect(toolRequestSchema.$schema).toBe(
			'https://json-schema.org/draft/2020-12/schema',
		);
		expect(toolRequestSchema.$id).toContain('tool-request');
	});

	it('accepts a minimal valid request', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 'abc123',
			method: 'tools/call',
			params: {
				name: 'echo',
			},
		};

		const result = validateToolRequest(payload);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(payload);
	});

	it('rejects requests without a params.name', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 42,
			method: 'tools/call',
			params: {},
		};

		const result = validateToolRequest(payload);
		expect(result.success).toBe(false);
		expect(result.errors?.some((msg) => msg.includes('params.name'))).toBe(
			true,
		);
	});
});

describe('tool response schema', () => {
	it('exposes JSON Schema metadata', () => {
		expect(toolResponseSchema.$schema).toBe(
			'https://json-schema.org/draft/2020-12/schema',
		);
		expect(toolResponseSchema.$id).toContain('tool-response');
	});

	it('accepts a structured tool result', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 'req-1',
			result: {
				content: [
					{
						type: 'text',
						text: 'pong',
					},
				],
				structuredContent: {
					status: 'ok',
				},
			},
		};

		const result = validateToolResponse(payload);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(payload);
	});

	it('rejects responses without content items', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 'req-2',
			result: {
				content: [],
			},
		};

		const result = validateToolResponse(payload);
		expect(result.success).toBe(false);
		expect(result.errors?.some((msg) => msg.includes('content'))).toBe(true);
	});
});

describe('tool error schema', () => {
	it('exposes JSON Schema metadata', () => {
		expect(toolErrorSchema.$schema).toBe(
			'https://json-schema.org/draft/2020-12/schema',
		);
		expect(toolErrorSchema.$id).toContain('tool-error');
	});

	it('accepts protocol error responses', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 'req-99',
			error: {
				code: 404,
				message: 'Tool not found',
			},
		};

		const result = validateToolErrorResponse(payload);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(payload);
	});

	it('rejects errors without a message', () => {
		const payload = {
			jsonrpc: '2.0',
			id: 'req-100',
			error: {
				code: 500,
			},
		};

		const result = validateToolErrorResponse(payload);
		expect(result.success).toBe(false);
		expect(result.errors?.some((msg) => msg.includes('message'))).toBe(true);
	});
});
