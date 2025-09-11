// Minimal local shims to avoid depending on @cortex-os/lib during typecheck

export class StructuredError extends Error {
	code: string;
	details?: unknown;
	constructor(code: string, message: string, details?: unknown) {
		super(message);
		this.code = code;
		this.details = details;
	}
	toJSON() {
		return { code: this.code, message: this.message, details: this.details };
	}
}

export function createJsonOutput(obj: unknown): string {
	try {
		return JSON.stringify(obj, null, 2);
	} catch {
		return String(obj);
	}
}

export function createStdOutput(text: string): string {
	return String(text);
}
