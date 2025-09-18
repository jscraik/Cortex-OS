import { nanoid } from 'nanoid';

// Map to track counters per prefix for deterministic mode
const counters = new Map<string, number>();

function getNextCounter(prefix: string): number {
	const current = counters.get(prefix) || 0;
	const next = current + 1;
	counters.set(prefix, next);
	return next;
}

/**
 * Generate a unique ID with optional deterministic mode
 */
export function generateId(prefix: string, deterministic = false): string {
	if (deterministic) {
		// Use a fixed counter for deterministic generation
		const counter = getNextCounter(prefix);
		return `${prefix}-${counter.toString().padStart(6, '0')}`;
	}

	// Use nanoid for non-deterministic mode
	return `${prefix}-${nanoid(8)}`;
}

/**
 * Reset counters for deterministic testing
 */
export function resetCounters(): void {
	counters.clear();
}
