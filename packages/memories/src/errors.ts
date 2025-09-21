export class VectorSizeError extends Error {
	constructor(expected: number, got: number) {
		super(`Vector size mismatch: expected ${expected}, but got ${got}`);
		this.name = 'VectorSizeError';
	}
}

export class MemoryValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MemoryValidationError';
	}
}

export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigurationError';
	}
}

export class StoreError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'StoreError';
		if (cause) {
			this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
		}
	}
}

export class PluginError extends Error {
	constructor(
		message: string,
		public readonly pluginName: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'PluginError';
		if (cause) {
			this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
		}
	}
}

export function isMemoryError(error: unknown): error is Error {
	return error instanceof Error;
}

export function wrapError(error: unknown, context: string): Error {
	if (error instanceof Error) {
		return new StoreError(`${context}: ${error.message}`, error);
	}
	return new StoreError(`${context}: ${String(error)}`);
}
