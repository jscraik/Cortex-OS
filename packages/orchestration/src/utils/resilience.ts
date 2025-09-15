import { OrchestrationError } from '../errors.js';

export function handleResilience(error: unknown, context: string): never {
	console.error(`Resilience failure in ${context}:`, error);
	const err = error instanceof Error ? error : new Error(String(error));
	// Normalize to OrchestrationError so callers can rely on a stable error type
	throw new OrchestrationError(
		'RESILIENCE_ERROR',
		`${context}: ${err.message}`,
	);
}
