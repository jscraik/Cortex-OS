// Minimal shim for archon test harness used by orchestration tests.
// Provides a describe-like function that marks tests as unavailable if ARCHON is not present.
import { describe } from 'vitest';

export function archonDescribe(name: string, fn: (ctx: { available: boolean }) => void) {
	const available = process.env.ARCHON_AVAILABLE === '1';
	return describe(name, () => fn({ available }));
}
