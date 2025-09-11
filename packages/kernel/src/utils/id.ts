import { randomUUID } from 'node:crypto';

let counter = 0;

export function resetIdCounter(): void {
	counter = 0;
}

export function generateId(prefix: string, deterministic = false): string {
	if (deterministic) {
		counter += 1;
		return `${prefix}-${String(counter).padStart(6, '0')}`;
	}
	return `${prefix}-${randomUUID()}`;
}
