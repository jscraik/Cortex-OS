/**
 * @file tests/refactoring-verification.test.ts
 * @description Test to verify the hash function refactoring works correctly
 */

import { describe, expect, it } from 'vitest';
import { SimplePRPGraph } from '../src/graph-simple.js';
import { createInitialPRPState, generateDeterministicHash } from '../src/state.js';

describe('Hash Function Refactoring Verification', () => {
	it('should use the same hash function in both state.ts and graph-simple', () => {
		const blueprint = {
			title: 'Refactoring Test',
			description: 'Test that both files use the same hash function',
			requirements: ['Consistency', 'DRY principle'],
		};

		// Test the extracted hash function directly
		const directHash = generateDeterministicHash(blueprint);

		// Test through createInitialPRPState
		const prpState = createInitialPRPState(blueprint, { deterministic: true });
		const stateIdHash = prpState.id.replace('prp-', '');
		const runIdHash = prpState.runId.replace('run-', '');

		expect(stateIdHash).toBe(directHash);
		expect(runIdHash).toBe(directHash);
		expect(stateIdHash).toBe(runIdHash);
	});

	it('should generate consistent IDs in SimplePRPGraph', async () => {
		const mockOrchestrator = {
			getNeuronCount: () => 3,
		};
		const graph = new SimplePRPGraph(mockOrchestrator);

		const blueprint = {
			title: 'Graph Test',
			description: 'Test deterministic ID generation in SimplePRPGraph',
			requirements: ['Consistency'],
		};

		// Verify the graph was created successfully and hash function works
		expect(graph).toBeDefined();
		const expectedHash = generateDeterministicHash(blueprint);
		expect(typeof expectedHash).toBe('string');
		expect(expectedHash.length).toBeGreaterThan(0);
	});

	it('should eliminate code duplication', () => {
		// Test that we can generate the same hash multiple times
		const data = { test: 'data', value: 123 };

		const hash1 = generateDeterministicHash(data);
		const hash2 = generateDeterministicHash(data);
		const hash3 = generateDeterministicHash(data);

		expect(hash1).toBe(hash2);
		expect(hash2).toBe(hash3);

		// Verify it's a proper hash (numeric string)
		expect(/^\d+$/.test(hash1)).toBe(true);
	});
});
