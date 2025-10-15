import { AsyncLocalStorage } from 'node:async_hooks';

interface LogContext {
	readonly correlationId?: string;
	readonly bindings?: Record<string, unknown>;
}

const storage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(context: LogContext, callback: () => Promise<T> | T): Promise<T> | T {
	const store = storage.getStore();
	// Merge any existing context with the new one so nested calls retain previously set values.
	const mergedContext = {
		...(store ?? {}),
		...context,
	};
	return storage.run(mergedContext, callback);
}

export function setLogContext(context: LogContext): void {
	const store = storage.getStore() ?? {};
	storage.enterWith({
		...store,
		...context,
	});
}

export function getLogContext(): LogContext | undefined {
	return storage.getStore();
}

export function getCorrelationIdFromContext(): string | undefined {
	return storage.getStore()?.correlationId as string | undefined;
}
