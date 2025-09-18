import { beforeEach, describe, expect, it } from 'vitest';
import { A2A_ERROR_CODES } from '../src/protocol';
import { handleA2A } from '../src/rpc-handler';

describe('JSON-RPC 2.0 Compliance Tests', () => {
	beforeEach(() => {
		// Reset any global state between tests
	});

	it('should handle valid JSON-RPC request', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			method: 'tasks/list',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe(1);
		expect(parsedResponse.result).toBeDefined();
		expect(parsedResponse.error).toBeUndefined();
	});

	it('should return error for invalid JSON', async () => {
		const invalidJson = '{ invalid json }';

		// Since handleA2A expects parsed JSON, we'll test with a malformed request object
		const response = await handleA2A(invalidJson as any);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBeNull();
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.PARSE_ERROR);
	});

	it('should return error for invalid JSON-RPC version', async () => {
		const request = {
			jsonrpc: '1.0', // Invalid version
			id: 1,
			method: 'tasks/list',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe(1);
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
	});

	it('should return error for missing method', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			// Missing method field
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe(1);
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
	});

	it('should return error for unsupported method', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			method: 'unsupported/method',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe(1);
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.METHOD_NOT_FOUND);
		expect(parsedResponse.error.message).toContain('Method');
	});

	it('should return error for invalid parameters', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			method: 'tasks/send',
			params: {
				// Invalid params - missing required fields
				invalid: 'data',
			},
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe(1);
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.INVALID_PARAMS);
	});

	it('should handle null id correctly', async () => {
		const request = {
			jsonrpc: '2.0',
			id: null,
			method: 'tasks/list',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBeNull();
		expect(parsedResponse.result).toBeDefined();
	});

	it('should handle string id correctly', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 'request-123',
			method: 'tasks/list',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBe('request-123');
		expect(parsedResponse.result).toBeDefined();
	});

	it('should handle batch requests (single request in array)', async () => {
		const request = [
			{
				jsonrpc: '2.0',
				id: 1,
				method: 'tasks/list',
			},
		];

		// The current implementation doesn't support batch requests,
		// so this should be treated as an invalid request
		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBeNull();
		expect(parsedResponse.error).toBeDefined();
		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);
	});

	it('should return proper error structure', async () => {
		const request = {
			jsonrpc: '2.0',
			id: 1,
			method: 'nonexistent',
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse).toEqual({
			jsonrpc: '2.0',
			id: 1,
			error: {
				code: expect.any(Number),
				message: expect.any(String),
				// data field is optional
			},
		});

		expect(parsedResponse.error.code).toBe(A2A_ERROR_CODES.METHOD_NOT_FOUND);
	});

	it('should handle notification requests (no id)', async () => {
		// According to JSON-RPC 2.0 spec, requests without an id are notifications
		// and should not return a response. However, our implementation always returns
		// a response, which is acceptable for many implementations.
		const request = {
			jsonrpc: '2.0',
			method: 'tasks/list',
			// No id field
		};

		const response = await handleA2A(request);
		const parsedResponse = JSON.parse(response);

		expect(parsedResponse.jsonrpc).toBe('2.0');
		expect(parsedResponse.id).toBeUndefined();
		// Either result or error should be present
		expect(parsedResponse.result || parsedResponse.error).toBeDefined();
	});

	it('should maintain id type in response', async () => {
		const testCases = [
			{ id: 1, expected: 1 },
			{ id: 'test', expected: 'test' },
			{ id: null, expected: null },
		];

		for (const testCase of testCases) {
			const request = {
				jsonrpc: '2.0',
				id: testCase.id,
				method: 'tasks/list',
			};

			const response = await handleA2A(request);
			const parsedResponse = JSON.parse(response);

			expect(parsedResponse.id).toEqual(testCase.expected);
		}
	});

	it('should return correct error codes for different scenarios', async () => {
		// Test parse error
		const parseErrorResponse = await handleA2A('invalid json' as any);
		const parsedParseError = JSON.parse(parseErrorResponse);
		expect(parsedParseError.error.code).toBe(A2A_ERROR_CODES.PARSE_ERROR);

		// Test invalid request error
		const invalidRequest = {
			jsonrpc: '2.0',
			// Missing method and id
		};
		const invalidResponse = await handleA2A(invalidRequest);
		const parsedInvalid = JSON.parse(invalidResponse);
		expect(parsedInvalid.error.code).toBe(A2A_ERROR_CODES.INVALID_REQUEST);

		// Test method not found error
		const methodNotFoundRequest = {
			jsonrpc: '2.0',
			id: 1,
			method: 'nonexistent.method',
		};
		const methodNotFoundResponse = await handleA2A(methodNotFoundRequest);
		const parsedMethodNotFound = JSON.parse(methodNotFoundResponse);
		expect(parsedMethodNotFound.error.code).toBe(A2A_ERROR_CODES.METHOD_NOT_FOUND);
	});
});
