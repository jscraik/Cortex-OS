/**
 * Simple logger utility for model gateway
 * Provides structured logging with context
 */

export interface LogContext {
	[key: string]: any;
}

class Logger {
	private isDevelopment = process.env.NODE_ENV === "development";

	warn(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.warn(`[MLX] ${message}`, context || "");
		}
	}

	error(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.error(`[MLX] ${message}`, context || "");
		}
	}

	info(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.log(`[MLX] ${message}`, context || "");
		}
	}

	debug(message: string, context?: LogContext): void {
		if (this.isDevelopment && process.env.DEBUG_MLX) {
			console.debug(`[MLX DEBUG] ${message}`, context || "");
		}
	}
}

export const logger = new Logger();
