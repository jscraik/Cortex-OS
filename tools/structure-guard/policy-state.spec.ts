import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	bootstrapPolicy,
	getCurrentPolicy,
	loadPolicyFromDisk,
	requirePolicy,
	setCurrentPolicy,
} from './policy-state';

const POLICY_PATH = path.resolve(__dirname, 'policy.json');

describe('policy-state helper', () => {
	it('bootstraps and exposes current policy', () => {
		const res = bootstrapPolicy(POLICY_PATH);
		expect(res.loaded).toBe(true);
		expect(getCurrentPolicy()).toBeTruthy();
		expect(requirePolicy().version).toMatch(/\d+\.\d+\.\d+/);
	});

	it('loadPolicyFromDisk returns validated policy', () => {
		const p = loadPolicyFromDisk(POLICY_PATH);
		expect(p.allowedPaths).toBeTruthy();
	});

	it('setCurrentPolicy swaps reference', () => {
		const p = loadPolicyFromDisk(POLICY_PATH);
		setCurrentPolicy(p);
		expect(getCurrentPolicy()).toBe(p);
	});

	it('requirePolicy does not throw after bootstrap', () => {
		// Ensures previously bootstrapped state is still accessible
		expect(() => requirePolicy()).not.toThrow();
	});
});
