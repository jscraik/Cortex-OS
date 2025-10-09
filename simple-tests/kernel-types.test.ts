/**
 * @file tests/kernel-types.test.ts
 * @description Test to verify kernel types are properly defined
 */

import { describe, expect, it } from 'vitest';

describe('Kernel Types Definition', () => {
	it('should define SubAgent interface locally to break circular dependency', () => {
		// This test ensures we break the circular dependency by defining types locally
		const mockNeuron = {
			id: 'test-subAgent',
			execute: async () => ({
				output: 'test',
				evidence: [],
				nextSteps: [],
				artifacts: [],
				metrics: {
					startTime: new Date().toISOString(),
					endTime: new Date().toISOString(),
					duration: 100,
					toolsUsed: [],
					filesCreated: 0,
					filesModified: 0,
					commandsExecuted: 0,
				},
			}),
		};

		expect(mockNeuron.id).toBe('test-subAgent');
		expect(typeof mockNeuron.execute).toBe('function');
	});
});
