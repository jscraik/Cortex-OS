import { describe, expect, it } from 'vitest';
import { SchemaRegistry } from '../src/index.js';

describe('SchemaRegistry Unit Tests', () => {
	it('should create registry instance with default options', () => {
		const registry = new SchemaRegistry();
		expect(registry).toBeDefined();
		expect(registry.getApp()).toBeDefined();
	});

	it('should create registry with custom options', () => {
		const registry = new SchemaRegistry({
			port: 4000,
			contractsPath: '/custom/path',
		});
		expect(registry).toBeDefined();
	});
});
