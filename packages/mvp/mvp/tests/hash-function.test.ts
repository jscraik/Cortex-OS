/**
 * @file tests/hash-function.test.ts
 * @description Test for the generateDeterministicHash helper function
 */

import { describe, expect, it } from 'vitest';
import { generateDeterministicHash } from '../src/state.js';

describe('generateDeterministicHash', () => {
	it('should generate consistent hashes for identical inputs', () => {
		const data = { title: 'Test', description: 'A test blueprint' };

		const hash1 = generateDeterministicHash(data);
		const hash2 = generateDeterministicHash(data);

		expect(hash1).toBe(hash2);
		expect(hash1).toBe('2062681286'); // Expected hash for this specific input
	});

	it('should generate different hashes for different inputs', () => {
		const data1 = { title: 'Test 1', description: 'First test' };
		const data2 = { title: 'Test 2', description: 'Second test' };

		const hash1 = generateDeterministicHash(data1);
		const hash2 = generateDeterministicHash(data2);

		expect(hash1).not.toBe(hash2);
	});

	it('should return a string', () => {
		const data = { test: 'value' };
		const hash = generateDeterministicHash(data);

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
	});
});
