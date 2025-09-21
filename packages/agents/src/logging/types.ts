/**
 * Core types for the structured logging system
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  /** Minimum log level to output */
  readonly level: LogLevel;
  /** Output format (json or pretty) */
  readonly format: 'json' | 'pretty';
  /** Output streams with their respective levels */
  readonly streams?: LoggerStream[];
  /** Buffer configuration for performance */
  readonly bufferOptions?: BufferOptions;
  /** Additional context bindings for child loggers */
  readonly bindings?: Record<string, unknown>;
}

export interface LoggerStream {
  /** Writable stream for log output */
  readonly stream: WritableStream<Uint8Array>;
  /** Minimum level for this stream */
  readonly level: LogLevel;
}

export interface BufferOptions {
  /** Buffer size in bytes */
  readonly size: number;
  /** Flush interval in milliseconds */
  readonly flushInterval: number;
}

export interface LogEntry {
  /** Log level */
  readonly level: LogLevel;
  /** Timestamp in ISO format */
  readonly time: string;
  /** Log message */
  readonly msg: string;
  /** Process ID */
  readonly pid: number;
  /** Hostname */
  readonly hostname: string;
  /** Log format version */
  readonly v: number;
  /** Additional context fields */
  readonly [key: string]: unknown;
}

export interface ErrorField {
  readonly type: string;
  readonly message: string;
  readonly stack?: string;
  readonly [key: string]: unknown;
}

export interface RotationConfig {
  /** Rotation type: size or time */
  readonly type: 'size' | 'time';
  /** Size threshold (e.g., '10MB', '1GB') */
  readonly size?: string;
  /** Time interval (e.g., '1h', 'daily', 'weekly') */
  readonly interval?: string;
  /** Specific time of day for rotation (HH:MM format) */
  readonly time?: string;
  /** Maximum number of rotated files to keep */
  readonly maxFiles: number;
  /** Whether to compress rotated files */
  readonly compress?: boolean;
  /** Custom filename pattern with date placeholders */
  readonly filenamePattern?: string;
}

export interface RedactionPattern {
  /** Pattern to match (field name or regex) */
  readonly pattern: string;
  /** Specific field names to redact */
  readonly fields?: string[];
  /** Replacement string or function */
  readonly replacement: string | ((value: string) => string);
}

export interface RedactionConfig {
  /** List of redaction patterns */
  readonly patterns: RedactionPattern[];
}

export interface CorrelationIdOptions {
  /** Logger instance for correlation ID tracking */
  readonly logger?: Logger;
  /** Header name to check for correlation ID */
  readonly headerName?: string;
  /** Custom ID generator function */
  readonly idGenerator?: () => string;
}

/** Interface for the Logger implementation */
export interface Logger {
  /** Log at trace level */
  trace: (msg: string, obj?: unknown) => void;
  /** Log at debug level */
  debug: (msg: string, obj?: unknown) => void;
  /** Log at info level */
  info: (msg: string, obj?: unknown) => void;
  /** Log at warn level */
  warn: (msg: string, obj?: unknown) => void;
  /** Log at error level */
  error: (msg: string, obj?: unknown) => void;
  /** Log at fatal level */
  fatal: (msg: string, obj?: unknown) => void;
  /** Create a child logger with additional context */
  child: (bindings: Record<string, unknown>) => Logger;
  /** Flush any buffered logs */
  flush: () => Promise<void>;
  /** Get number of pending logs (optional) */
  getPendingCount?: () => number;
}