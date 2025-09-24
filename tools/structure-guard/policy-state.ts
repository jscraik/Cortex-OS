import { readFileSync } from 'node:fs';
import { type StructureGuardPolicy, validatePolicy } from './policy-schema.js';

// Atomic module-level reference to current validated policy
let currentPolicy: StructureGuardPolicy | undefined;

export function getCurrentPolicy(): StructureGuardPolicy | undefined {
	return currentPolicy;
}

export function setCurrentPolicy(policy: StructureGuardPolicy) {
	currentPolicy = policy;
}

export function loadPolicyFromDisk(path: string): StructureGuardPolicy {
	const raw = JSON.parse(readFileSync(path, 'utf8'));
	const result = validatePolicy(raw, {
		version: raw.version,
		allowDeprecated: true,
	});
	if (!result.valid || !result.policy) {
		throw new Error(
			`Failed to validate policy file at ${path}: ${result.errors?.join('; ') ?? 'unknown error'}`,
		);
	}
	return result.policy;
}

export function bootstrapPolicy(path: string) {
	try {
		const policy = loadPolicyFromDisk(path);
		setCurrentPolicy(policy);
		return { policy, loaded: true };
	} catch (e) {
		return {
			error: e instanceof Error ? e : new Error(String(e)),
			loaded: false,
		};
	}
}

// Convenience guard
export function requirePolicy(): StructureGuardPolicy {
	if (!currentPolicy) throw new Error('Policy not loaded yet');
	return currentPolicy;
}
