export type LogMeta = Record<string, unknown>;

function log(level: 'info' | 'warn' | 'error', message: string, meta?: LogMeta): void {
	const entry = {
		level,
		timestamp: new Date().toISOString(),
		message,
		...meta,
	};
	// eslint-disable-next-line no-console
	console[level === 'info' ? 'log' : level](JSON.stringify(entry));
}

export function logInfo(message: string, meta?: LogMeta): void {
	log('info', message, meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
	log('warn', message, meta);
}

export function logError(message: string, meta?: LogMeta): void {
	log('error', message, meta);
}
