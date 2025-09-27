/**
 * Logging utilities for A2A system with brAInwav branding
 * Functional approach following Sept 2025 standards
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
	correlationId?: string;
	timestamp?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Format message with brAInwav branding
 */
export const formatBrAInwavMessage = (
	level: LogLevel,
	message: string,
	component = 'A2A',
	context?: LogContext,
): string => {
	const timestamp = context?.timestamp || new Date().toISOString();
	const componentName = component.startsWith('brAInwav') ? component : `brAInwav-${component}`;

	let formatted = `${timestamp} [${componentName}] ${level.toUpperCase()}: ${message}`;

	if (context?.correlationId) {
		formatted += ` [correlationId=${context.correlationId}]`;
	}

	return formatted;
};

/**
 * Log info message with brAInwav branding
 */
export const logInfo = (message: string, component?: string, context?: LogContext): void => {
	const formatted = formatBrAInwavMessage('info', message, component, context);
	console.log(formatted);
};

/**
 * Log warning message with brAInwav branding
 */
export const logWarn = (message: string, component?: string, context?: LogContext): void => {
	const formatted = formatBrAInwavMessage('warn', message, component, context);
	console.warn(formatted);
};

/**
 * Log error message with brAInwav branding
 */
export const logError = (message: string, component?: string, context?: LogContext): void => {
	const formatted = formatBrAInwavMessage('error', message, component, context);
	console.error(formatted);
};

/**
 * Log debug message with brAInwav branding
 */
export const logDebug = (message: string, component?: string, context?: LogContext): void => {
	const formatted = formatBrAInwavMessage('debug', message, component, context);
	console.debug(formatted);
};
