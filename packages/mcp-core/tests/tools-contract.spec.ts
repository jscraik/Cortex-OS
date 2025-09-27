import { describe, expect, it } from 'vitest';
import { allTools } from '../src/tools/index.js';

describe('MCP tool production contracts', () => {
	it('exposes only concrete, non-mock tools', () => {
		for (const tool of allTools) {
			const name = tool.name.toLowerCase();
			const description = tool.description.toLowerCase();
			expect(name).not.toContain('mock');
			expect(description).not.toContain('mock');
			expect(typeof tool.execute).toBe('function');
		}
	});
});
