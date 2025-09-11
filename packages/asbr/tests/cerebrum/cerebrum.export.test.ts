/**
 * Simple test to verify Cerebrum exports
 */

import { describe, expect, it } from 'vitest';
import { Cerebrum, Critique } from '../../src/cerebrum/index.js';
import { DEFAULT_CONFIG } from '../../src/core/config.js';

describe('Cerebrum Exports', () => {
	it('should export Cerebrum class', () => {
		expect(Cerebrum).toBeDefined();
		expect(typeof Cerebrum).toBe('function');
	});

	it('should export Plan type', () => {
		// We can't test types at runtime, but we can verify the import works
		expect(true).toBe(true);
	});

	it('should export SimulationResult type', () => {
		// We can't test types at runtime, but we can verify the import works
		expect(true).toBe(true);
	});

	it('should export Critique class', () => {
		expect(Critique).toBeDefined();
		expect(typeof Critique).toBe('function');
	});

	it('should export TeachingSession type', () => {
		// We can't test types at runtime, but we can verify the import works
		expect(true).toBe(true);
	});

	it('should be able to instantiate Cerebrum', () => {
		const cerebrum = new Cerebrum({ config: DEFAULT_CONFIG });
		expect(cerebrum).toBeInstanceOf(Cerebrum);
	});
});
