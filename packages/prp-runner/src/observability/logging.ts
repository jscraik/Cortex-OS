import type { Express, NextFunction, Request, Response } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
	level: LogLevel;
	msg: string;
	time: string; // ISO string
	requestId?: string;
	meta?: Record<string, unknown>;
}

export interface Logger {
	child(bindings: Record<string, unknown>): Logger;
	debug(msg: string, meta?: Record<string, unknown>): void;
	info(msg: string, meta?: Record<string, unknown>): void;
	warn(msg: string, meta?: Record<string, unknown>): void;
	error(msg: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
	sink?: (entry: LogEntry) => void; // for tests or custom transports
}

// Keys to redact (case-insensitive)
const REDACT_KEYS = new Set([
	'authorization',
	'cookie',
	'set-cookie',
	'x-api-key',
	'api_key',
	'password',
	'token',
	'secret',
	'access_token',
	'refresh_token',
]);

export function redact<T>(value: T): T {
	function inner(v: unknown): unknown {
		if (v === null || v === undefined) return v;
		const t = typeof v;
		if (t === 'string' || t === 'number' || t === 'boolean') return v;
		if (Array.isArray(v)) return v.map(inner);
		if (t === 'object') {
			const src = v as Record<string, unknown>;
			const out: Record<string, unknown> = {};
			for (const [k, val] of Object.entries(src)) {
				const lower = k.toLowerCase();
				if (REDACT_KEYS.has(lower)) {
					out[k] = '[REDACTED]';
				} else {
					out[k] = inner(val);
				}
			}
			return out;
		}
		return v;
	}
	return inner(value) as T;
}

export function createLogger(options: LoggerOptions = {}): Logger {
	const sink =
		options.sink ??
		((entry: LogEntry) => {
			// Default sink: stdout as JSON line
			console.log(JSON.stringify(entry));
		});

	function baseLog(
		level: LogLevel,
		bindings: Record<string, unknown>,
		msg: string,
		meta?: Record<string, unknown>,
	) {
		const entry: LogEntry = {
			level,
			msg,
			time: new Date().toISOString(),
			requestId: (bindings.requestId as string | undefined) ?? undefined,
			meta: meta ? redact(meta) : undefined,
		};
		sink(entry);
	}

	function make(bindings: Record<string, unknown>): Logger {
		return {
			child(childBindings: Record<string, unknown>) {
				return make({ ...bindings, ...childBindings });
			},
			debug(msg, meta) {
				baseLog('debug', bindings, msg, meta);
			},
			info(msg, meta) {
				baseLog('info', bindings, msg, meta);
			},
			warn(msg, meta) {
				baseLog('warn', bindings, msg, meta);
			},
			error(msg, meta) {
				baseLog('error', bindings, msg, meta);
			},
		};
	}

	return make({});
}

import { secureRatio } from '../lib/secure-random.js';

export interface ApplyLoggingOptions extends LoggerOptions {
	logger?: Logger;
	sampleRate?: number; // 0..1 sampling for finish logs
}

export function applyLogging(app: Express, opts: ApplyLoggingOptions = {}): Logger {
	const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
	const root = opts.logger ?? createLogger({ sink: opts.sink });
	const sampleRate = typeof opts.sampleRate === 'number' ? opts.sampleRate : 1;

	// Attach per-request logger with correlation id
	app.use((req: Request, res: Response, next: NextFunction): void => {
		const r = req as Request & { requestId?: string; log?: Logger };
		const reqId =
			r.requestId ||
			req.header('x-request-id') ||
			(res.getHeader('x-request-id') as string | undefined) ||
			'';
		const child = root.child({ requestId: reqId });
		r.log = child;
		const started = process.hrtime.bigint();
		if (level === 'debug')
			child.debug('request:start', {
				method: req.method,
				path: req.path,
				ip: req.ip,
				ua: req.header('user-agent') || '',
			});
		res.on('finish', () => {
			const ended = process.hrtime.bigint();
			const ns = Number(ended - started);
			const ms = Math.round(ns / 1e6);
			if (secureRatio() <= sampleRate)
				child.info('request:finish', {
					method: req.method,
					path: req.path,
					status: res.statusCode,
					durationMs: ms,
					contentLength: res.getHeader('content-length') || 0,
				});
		});
		next();
	});

	return root;
}
