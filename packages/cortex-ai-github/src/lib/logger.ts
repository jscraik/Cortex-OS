export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function log(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
	const entry = { ts: new Date().toISOString(), lvl: level, msg, ...fields };
	let method: 'log' | 'warn' | 'error' = 'log';
	if (level === 'warn') method = 'warn';
	if (level === 'error') method = 'error';
	console[method](JSON.stringify(entry));
}
