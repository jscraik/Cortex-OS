/**
 * Simple logger utility for model gateway
 * Provides structured logging with context
 */

export interface LogContext {
	[key: string]: any;
}

type Level = 'error' | 'warn' | 'info' | 'debug';

class Logger {
	private readonly level: Level;

	constructor() {
		const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
		const allowed: Level[] = ['error', 'warn', 'info', 'debug'];
		this.level = allowed.includes(env as Level) ? (env as Level) : 'info';
	}

	private shouldLog(l: Level): boolean {
		const order: Level[] = ['error', 'warn', 'info', 'debug'];
		return order.indexOf(l) <= order.indexOf(this.level);
	}

	warn(message: string, context?: LogContext): void {
		if (this.shouldLog('warn')) {
			console.warn(`[MLX] ${message}`, context || '');
		}
	}

	error(message: string, context?: LogContext): void {
		if (this.shouldLog('error')) {
			console.error(`[MLX] ${message}`, context || '');
		}
	}

	info(message: string, context?: LogContext): void {
		if (this.shouldLog('info')) {
			console.log(`[MLX] ${message}`, context || '');
		}
	}

	debug(message: string, context?: LogContext): void {
		if (this.shouldLog('debug')) {
			console.debug(`[MLX DEBUG] ${message}`, context || '');
		}
	}
}

export const logger = new Logger();
