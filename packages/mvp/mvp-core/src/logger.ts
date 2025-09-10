import pino, { type Logger as Pino } from 'pino';

export type Logger = Pino;

export function createLogger(name: string, level = 'info'): Logger {
	return pino({ name, level, base: null });
}
