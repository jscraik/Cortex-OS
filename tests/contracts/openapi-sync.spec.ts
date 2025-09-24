import { describe, expect, it } from 'vitest';
import { generateOpenApiSpec, getRouteHandlers } from '../src/utils/openapi';

// This test ensures every public endpoint has non-mock contract coverage

describe('OpenAPI contract vs. route handlers', () => {
	it('should have real handler exports for all endpoints', async () => {
		const spec = await generateOpenApiSpec();
		const handlers = getRouteHandlers();
		for (const path in spec.paths) {
			for (const method in spec.paths[path]) {
				const handler = handlers[path]?.[method];
				expect(handler).toBeDefined();
				// Check for stub payloads
				const result = await handler({});
				expect(typeof result).toBe('object');
				expect(JSON.stringify(result)).not.toMatch(/stub|placeholder|mock/i);
			}
		}
	});
});
