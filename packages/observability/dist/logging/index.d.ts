/**
 * @fileoverview Structured logging with redaction and ULID linking
 */
import pino from 'pino';
import type { LogEntry, LogLevel, TraceContext, ULID } from '../types.js';
/**
 * Create logger with redaction
 */
export declare function createLogger(
	component: string,
	level?: LogLevel,
): pino.Logger<never, boolean>;
/**
 * Log with ULID and trace context
 */
export declare function logWithContext(
	logger: pino.Logger,
	level: LogLevel,
	message: string,
	runId: ULID,
	traceContext?: TraceContext,
	extra?: Record<string, unknown>,
): void;
/**
 * Create structured log entry
 */
export declare function createLogEntry(
	component: string,
	level: LogLevel,
	message: string,
	runId: ULID,
	traceContext?: TraceContext,
	extra?: Record<string, unknown>,
): LogEntry;
/**
 * Log evidence pointer
 */
export declare function logEvidence(
	logger: pino.Logger,
	runId: ULID,
	evidenceType: string,
	evidencePointer: {
		url?: string;
		line?: number;
		file?: string;
		hash?: string;
	},
): void;
//# sourceMappingURL=index.d.ts.map
