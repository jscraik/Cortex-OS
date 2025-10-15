import type { BufferOptions, LogEntry, LoggerConfig, LoggerStream, LogLevel } from './types.js';
import { getLogContext } from './log-context.js';

const textEncoder = new TextEncoder();

const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

/**
 * Safe JSON.stringify that handles circular references and Error objects
 */
function safeStringify(obj: any, indent?: string | number): string {
	const cache = new Set();

	function processValue(value: any): any {
		if (typeof value === 'object' && value !== null) {
			if (cache.has(value)) {
				return '[Circular]';
			}
			cache.add(value);

			// Handle Error objects
			if (value instanceof Error) {
				const errorObj: any = {
					type: value.constructor.name,
					message: value.message,
					stack: value.stack,
				};

				// Copy enumerable properties
				Object.getOwnPropertyNames(value).forEach((key) => {
					if (!['type', 'message', 'stack'].includes(key)) {
						(errorObj as any)[key] = (value as any)[key];
					}
				});

				return errorObj;
			}

			// Recursively process object properties
			if (Array.isArray(value)) {
				return value.map(processValue);
			}

			const result: any = {};
			for (const [key, val] of Object.entries(value)) {
				result[key] = processValue(val);
			}
			return result;
		}
		return value;
	}

	return JSON.stringify(processValue(obj), null, indent);
}

const DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB
const DEFAULT_FLUSH_INTERVAL = 1000; // 1 second

/**
 * Structured Logger implementation supporting multiple streams and formats
 */
export class Logger {
	private readonly level: number;
	private readonly format: 'json' | 'pretty';
	private readonly streams: LoggerStream[];
	private readonly bufferOptions: BufferOptions;
	private readonly hostname: string;
	private readonly pid: number;
	private readonly bindings?: Record<string, unknown>;
	private buffer: { message: string; level: LogLevel }[] = [];
	private flushTimeout?: NodeJS.Timeout;
	private writingPromises: Map<LoggerStream, Promise<void>> = new Map();

	constructor(config: LoggerConfig) {
		this.level = LOG_LEVELS[config.level];
		this.format = config.format;
		this.streams = config.streams || [];
		this.bufferOptions = config.bufferOptions || {
			size: DEFAULT_BUFFER_SIZE,
			flushInterval: DEFAULT_FLUSH_INTERVAL,
		};
		this.hostname = 'localhost'; // In real implementation, get from os.hostname()
		this.pid = process.pid;
		this.bindings = config.bindings;

		// Start auto-flush timer
		this.startFlushTimer();
	}

	/**
	 * Create a child logger with additional context
	 */
	child(bindings: Record<string, unknown>): Logger {
		return new Logger({
			level: this.getLevelFromNumber(this.level),
			format: this.format,
			streams: this.streams,
			bufferOptions: this.bufferOptions,
			bindings: {
				...(this.bindings ?? {}),
				...bindings,
			},
		});
	}

	/**
	 * Log at trace level
	 */
	trace(msg: string, obj?: unknown): void {
		this.write('trace', msg, obj);
	}

	/**
	 * Log at debug level
	 */
	debug(msg: string, obj?: unknown): void {
		this.write('debug', msg, obj);
	}

	/**
	 * Log at info level
	 */
	info(msg: string, obj?: unknown): void {
		this.write('info', msg, obj);
	}

	/**
	 * Log at warn level
	 */
	warn(msg: string, obj?: unknown): void {
		this.write('warn', msg, obj);
	}

	/**
	 * Log at error level
	 */
	error(msg: string, obj?: unknown): void {
		this.write('error', msg, obj);
	}

	/**
	 * Log at fatal level
	 */
	fatal(msg: string, obj?: unknown): void {
		this.write('fatal', msg, obj);
	}

	/**
	 * Flush any buffered logs
	 */
	async flush(): Promise<void> {
		if (this.flushTimeout) {
			clearTimeout(this.flushTimeout);
			this.flushTimeout = undefined;
		}

		if (this.buffer.length === 0) {
			return;
		}

		const messages = [...this.buffer];
		this.buffer = [];

		// Write to all streams
		await Promise.allSettled(
			this.streams.map(async (stream) => {
				const streamMessages = messages.filter(
					(item) => LOG_LEVELS[item.level] >= LOG_LEVELS[stream.level],
				);

				if (streamMessages.length === 0) {
					return;
				}

				const previous = this.writingPromises.get(stream) ?? Promise.resolve();
				let nextPromise: Promise<void>;

				const performWrite = async () => {
					try {
						const writer = stream.stream.getWriter();
						try {
							for (const item of streamMessages) {
								const encoded = textEncoder.encode(`${item.message}\n`);
								await writer.write(encoded);
							}
						} finally {
							writer.releaseLock();
						}
					} catch (error) {
						console.error('Failed to write to stream:', error);
					}
				};

				nextPromise = previous
					.catch(() => undefined)
					.then(performWrite)
					.finally(() => {
						if (this.writingPromises.get(stream) === nextPromise) {
							this.writingPromises.delete(stream);
						}
					});

				this.writingPromises.set(stream, nextPromise);
				await nextPromise;
			}),
		);
	}

	/**
	 * Get number of pending logs
	 */
	getPendingCount(): number {
		return this.buffer.length;
	}

	private write(level: LogLevel, msg: string, obj?: unknown): void {
		if (LOG_LEVELS[level] < this.level) {
			return;
		}

		const logContext = getLogContext();
		const contextualBindings = logContext?.bindings ?? {};

		const extraFields =
			obj === undefined
				? {}
				: typeof obj === 'object' && obj !== null
					? (obj as Record<string, unknown>)
					: { obj };

		const entry: LogEntry = {
			level,
			time: new Date().toISOString(),
			msg,
			pid: this.pid,
			hostname: this.hostname,
			v: 1,
			...(this.bindings ?? {}),
			...contextualBindings,
			...extraFields,
		};
	
		if (logContext?.correlationId) {
			(entry as Record<string, unknown>).correlationId = logContext.correlationId;
		}

		const message = this.format === 'json' ? safeStringify(entry) : this.formatPretty(entry);

		this.buffer.push({ message, level });

		// Check if buffer should be flushed
		const bufferSize = this.buffer.reduce((sum, item) => sum + item.message.length, 0);
		if (bufferSize >= this.bufferOptions.size) {
			this.flush().catch(console.error);
		}
	}

	private formatPretty(entry: LogEntry): string {
		const time = new Date(entry.time).toLocaleTimeString();
		const level = entry.level.toUpperCase().padEnd(5);
		return `${time} ${level} [${entry.pid}]: ${entry.msg}`;
	}

	private startFlushTimer(): void {
		this.flushTimeout = setInterval(() => {
			this.flush().catch(console.error);
		}, this.bufferOptions.flushInterval);
	}

	private getLevelFromNumber(levelNum: number): LogLevel {
		for (const [level, num] of Object.entries(LOG_LEVELS)) {
			if (num === levelNum) {
				return level as LogLevel;
			}
		}
		return 'info';
	}
}
