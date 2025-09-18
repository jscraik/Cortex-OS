import { StructuredError } from './structured-error';

export function ensureDeterministicSeed(seed?: number): number {
	if (seed == null) return 1;
	if (!Number.isInteger(seed) || seed <= 0) {
		throw new StructuredError('INVALID_INPUT', `Seed must be a positive integer: ${seed}`);
	}
	return seed;
}
