import { createHTTPS } from '@cortex-os/mcp-transport/https';
import { describe, expect, it } from 'vitest';

describe('https', () => {
	it('throws without endpoint', () => {
		// @ts-expect-error
		expect(() => createHTTPS({})).toThrow();
	});
});
