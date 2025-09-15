// Structured logging utility using Winston

import path from 'node:path';
import winston from 'winston';

// Define log levels
const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
};

// Define colors for each level
const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	http: 'magenta',
	debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
	winston.format.colorize({ all: true }),
	winston.format.printf(
		(info) => `${info.timestamp} ${info.level}: ${info.message}`,
	),
);

// Custom format for file output
const fileFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
	winston.format.errors({ stack: true }),
	winston.format.json(),
);

// Create transports array
const transports = [
	// Console transport
	new winston.transports.Console({
		format: consoleFormat,
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	}),

	// File transport for errors
	new winston.transports.File({
		filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
		level: 'error',
		format: fileFormat,
		maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10), // 10MB
		maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
	}),

	// File transport for all logs
	new winston.transports.File({
		filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
		format: fileFormat,
		maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10), // 10MB
		maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
	}),
];

// Create the logger
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	levels,
	transports,
	exitOnError: false,
});

// Morgan stream object for HTTP logging
export const morganStream = {
	write: (message: string) => {
		logger.http(message.trim());
	},
};

// Helper functions for structured logging
export const logWithContext = (
	level: string,
	message: string,
	meta: object = {},
) => {
	logger.log(level, message, {
		timestamp: new Date().toISOString(),
		service: 'cortex-webui-backend',
		...meta,
	});
};

export const logError = (error: Error, context: object = {}) => {
	logger.error('Application Error', {
		error: {
			name: error.name,
			message: error.message,
			stack: error.stack,
		},
		timestamp: new Date().toISOString(),
		service: 'cortex-webui-backend',
		...context,
	});
};

export const logAuth = (
	action: string,
	userId?: string,
	details: object = {},
) => {
	logWithContext('info', `Auth: ${action}`, {
		category: 'authentication',
		userId,
		action,
		...details,
	});
};

export const logChat = (
	action: string,
	userId: string,
	details: object = {},
) => {
	logWithContext('info', `Chat: ${action}`, {
		category: 'chat',
		userId,
		action,
		...details,
	});
};

export const logAPI = (
	method: string,
	path: string,
	statusCode: number,
	responseTime: number,
	userId?: string,
) => {
	logWithContext('http', `${method} ${path} ${statusCode}`, {
		category: 'api',
		method,
		path,
		statusCode,
		responseTime,
		userId,
	});
};

export const logSecurity = (event: string, details: object = {}) => {
	logWithContext('warn', `Security: ${event}`, {
		category: 'security',
		event,
		...details,
	});
};

export const logPerformance = (
	operation: string,
	duration: number,
	details: object = {},
) => {
	logWithContext('info', `Performance: ${operation} took ${duration}ms`, {
		category: 'performance',
		operation,
		duration,
		...details,
	});
};

// Ensure logs directory exists
import { mkdirSync } from 'node:fs';

const logDir = process.env.LOG_DIR || './logs';
try {
	mkdirSync(logDir, { recursive: true });
} catch (error) {
	// Cannot use logger before it's fully created; fall back to stderr with structured prefix
	console.error('[logger:init] could not create logs directory', error);
}

export default logger;
