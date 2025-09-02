export function handleResilience(error: unknown, context: string): never {
	console.error(`Resilience failure in ${context}:`, error);
	throw error instanceof Error ? error : new Error(String(error));
}
