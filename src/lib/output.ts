import { type errorCodes, StructuredError } from "./structured-error";

export type OutputMeta = {
	timestamp: string; // ISO-8601
};

export function withTimestamp<T>(payload: T): { meta: OutputMeta; data: T } {
	return {
		meta: { timestamp: new Date().toISOString() },
		data: payload,
	};
}

export function createStdOutput(text: string): string {
	const ts = new Date().toISOString();
	return `[${ts}] ${text}`;
}

export function createJsonOutput<T>(
	payload: T,
	extras?: Record<string, unknown>,
) {
	return JSON.stringify(
		{
			...withTimestamp(payload),
			...(extras ?? {}),
		},
		null,
		2,
	);
}

export function formatError(
	err: unknown,
	code: keyof typeof errorCodes = "UNKNOWN_ERROR",
) {
	const se =
		err instanceof StructuredError
			? err
			: new StructuredError(code, String(err));
	return createJsonOutput({ error: se.toJSON() });
}
