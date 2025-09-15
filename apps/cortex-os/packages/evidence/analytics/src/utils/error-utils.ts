/** Utility helpers for safe error handling */
export function safeErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err;
	try {
		return JSON.stringify(err);
	} catch {
		return 'Unknown error';
	}
}

export function safeErrorStack(err: unknown): string | undefined {
	return err instanceof Error ? err.stack : undefined;
}
