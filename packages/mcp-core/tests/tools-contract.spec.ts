import { describe, expect, it } from 'vitest';
import { getToolRegistry } from '../src/registry';

// This test checks that each MCP tool executor references a concrete adapter class, not 'mock' strings

describe('MCP tool contract enforcement', () => {
	it('should reference concrete adapter classes for all tools', () => {
		const registry = getToolRegistry();
		for (const toolName in registry) {
			const executor = registry[toolName]?.executor;
			expect(executor).toBeDefined();
			expect(typeof executor).toBe('function');
			// Fail if executor is a mock or placeholder
			expect(executor.name).not.toMatch(/mock|placeholder/i);
		}
	});
});
