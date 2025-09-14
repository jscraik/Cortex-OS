import { EventEmitter } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import type { Readable, Writable } from 'node:stream';
import { z } from 'zod';

// Request/Response schemas
const JsonRpcRequestSchema = z.object({
	id: z.union([z.string(), z.number()]),
	method: z.string(),
	params: z.any().optional(),
});

const JsonRpcResponseSchema = z.object({
	id: z.union([z.string(), z.number()]),
	result: z.any().optional(),
	error: z
		.object({
			code: z.number(),
			message: z.string(),
			data: z.any().optional(),
		})
		.optional(),
});

type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

// Circuit breaker observability event schemas
// Minimal shape to avoid coupling to a broader event bus yet; can be promoted later.
export const CircuitOpenedEventSchema = z.object({
	type: z.literal('circuit.opened'),
	service: z.string(),
	failures: z.number(),
	threshold: z.number(),
	time: z.string(),
});
export const CircuitHalfOpenEventSchema = z.object({
	type: z.literal('circuit.half_open'),
	service: z.string(),
	failures: z.number(),
	threshold: z.number(),
	time: z.string(),
});
export const CircuitClosedEventSchema = z.object({
	type: z.literal('circuit.closed'),
	service: z.string(),
	failures: z.number(),
	threshold: z.number(),
	time: z.string(),
});

// Configuration interfaces
export interface RateLimitOptions {
	maxRequests: number;
	windowMs: number;
}

export interface RetryOptions {
	maxRetries: number;
	retryDelay: number;
	maxDelay?: number;
}

export interface CircuitBreakerOptions {
	failureThreshold: number;
	resetTimeout: number;
}

export interface StdioHttpBridgeOptions {
	httpEndpoint: string;
	transport?: 'http' | 'sse';
	stdin?: Readable;
	stdout?: Writable;
	enableRateLimiting?: boolean;
	rateLimitOptions?: RateLimitOptions;
	retryOptions?: RetryOptions;
	circuitBreakerOptions?: CircuitBreakerOptions;
	/** Optional per-request timeout in milliseconds (HTTP, SSE connect, and stdio line processing forward calls). */
	requestTimeoutMs?: number;
}

export class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TimeoutError';
	}
}

function withTimeout<T>(
	promise: Promise<T>,
	ms: number | undefined,
	label: string,
): Promise<T> {
	if (!ms || ms <= 0) return promise;
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new TimeoutError(`${label} timed out after ${ms}ms`));
		}, ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e instanceof Error ? e : new Error(String(e)));
			},
		);
	});
}

// Rate limiter implementation
class RateLimiter {
	private requests: number[] = [];

	constructor(private readonly options: RateLimitOptions) {}

	canMakeRequest(): boolean {
		const now = Date.now();
		const windowStart = now - this.options.windowMs;

		// Clean old requests
		this.requests = this.requests.filter((time) => time > windowStart);

		if (this.requests.length >= this.options.maxRequests) {
			return false;
		}

		this.requests.push(now);
		return true;
	}

	reset(): void {
		this.requests = [];
	}
}

// Circuit breaker implementation
class CircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: 'closed' | 'open' | 'half-open' = 'closed';

	constructor(
		private readonly options: CircuitBreakerOptions,
		private readonly emitter: EventEmitter,
		private readonly service: string,
	) {}

	private emit(
		event: 'circuit.opened' | 'circuit.half_open' | 'circuit.closed',
	) {
		const base = {
			service: this.service,
			failures: this.failures,
			threshold: this.options.failureThreshold,
			time: new Date().toISOString(),
		};
		if (event === 'circuit.opened')
			this.emitter.emit(
				'circuit.opened',
				CircuitOpenedEventSchema.parse({ type: event, ...base }),
			);
		else if (event === 'circuit.half_open')
			this.emitter.emit(
				'circuit.half_open',
				CircuitHalfOpenEventSchema.parse({ type: event, ...base }),
			);
		else
			this.emitter.emit(
				'circuit.closed',
				CircuitClosedEventSchema.parse({ type: event, ...base }),
			);
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === 'open') {
			const now = Date.now();
			if (now - this.lastFailureTime > this.options.resetTimeout) {
				this.state = 'half-open';
				this.emit('circuit.half_open');
			} else {
				throw new Error('Circuit breaker is open');
			}
		}

		try {
			const result = await fn();
			if (this.state === 'half-open') {
				this.state = 'closed';
				this.failures = 0;
				this.emit('circuit.closed');
			}
			return result;
		} catch (error) {
			this.failures++;
			this.lastFailureTime = Date.now();

			if (this.failures >= this.options.failureThreshold) {
				if (this.state === 'closed' || this.state === 'half-open') {
					this.state = 'open';
					this.emit('circuit.opened');
				}
			}

			throw error;
		}
	}

	reset(): void {
		const wasOpen = this.state === 'open' || this.state === 'half-open';
		this.state = 'closed';
		this.failures = 0;
		this.lastFailureTime = 0;
		if (wasOpen) {
			this.emit('circuit.closed');
		}
	}
}

// Main bridge implementation
export class StdioHttpBridge extends EventEmitter {
	private readonly rateLimiter?: RateLimiter;
	private readonly circuitBreaker?: CircuitBreaker;
	private readonly stdin: Readable;
	private readonly stdout: Writable;
	private sseClient?: http.ClientRequest;
	private isRunning = false;
	private closed = false;

	constructor(private readonly options: StdioHttpBridgeOptions) {
		super();

		this.stdin = options.stdin || process.stdin;
		this.stdout = options.stdout || process.stdout;

		if (options.enableRateLimiting) {
			this.rateLimiter = new RateLimiter(
				options.rateLimitOptions || {
					maxRequests: 10,
					windowMs: 1000,
				},
			);
		}

		if (options.circuitBreakerOptions) {
			this.circuitBreaker = new CircuitBreaker(
				options.circuitBreakerOptions,
				this,
				options.httpEndpoint,
			);
		}
	}

	async forward(request: JsonRpcRequest): Promise<JsonRpcResponse> {
		if (this.closed) throw new Error('BridgeClosedError: bridge is closed');
		// Validate request
		const validatedRequest = JsonRpcRequestSchema.parse(request);

		// Check rate limit
		if (this.rateLimiter && !this.rateLimiter.canMakeRequest()) {
			throw new Error('Rate limit exceeded');
		}

		// Execute with circuit breaker if configured
		const executeFn = () => this.sendHttpRequest(validatedRequest);

		if (this.circuitBreaker) {
			return this.circuitBreaker.execute(executeFn);
		}

		return executeFn();
	}

	private async sendHttpRequest(
		request: JsonRpcRequest,
	): Promise<JsonRpcResponse> {
		const retryOptions = this.options.retryOptions || {
			maxRetries: 0,
			retryDelay: 1000,
		};

		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
			try {
				return await withTimeout(
					this.makeHttpRequest(request),
					this.options.requestTimeoutMs,
					'HTTP request',
				);
			} catch (error) {
				lastError = error as Error;

				if (attempt < retryOptions.maxRetries) {
					// Exponential backoff
					const delay = Math.min(
						retryOptions.retryDelay * 2 ** attempt,
						retryOptions.maxDelay || 30000,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error('Request failed');
	}

	private makeHttpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
		return new Promise((resolve, reject) => {
			const url = new URL(this.options.httpEndpoint);
			const isHttps = url.protocol === 'https:';
			const httpModule = isHttps ? https : http;

			const options = {
				hostname: url.hostname,
				port: url.port || (isHttps ? 443 : 80),
				path: url.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			};

			const req = httpModule.request(options, (res) => {
				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					const status = res.statusCode ?? 0;
					if (status >= 400) {
						const snippet = data.slice(0, 256);
						reject(
							new Error(
								`HTTP ${status}: ${snippet}${data.length > 256 ? '…' : ''}`,
							),
						);
						return;
					}

					try {
						const response = JSON.parse(data);
						const validated = JsonRpcResponseSchema.parse(response);
						resolve(validated);
					} catch (error) {
						reject(
							new Error(`Invalid response JSON: ${(error as Error).message}`),
						);
					}
				});
			});

			req.on('error', reject);
			req.write(JSON.stringify(request));
			req.end();
		});
	}

	async connect(): Promise<void> {
		if (this.options.transport === 'sse') {
			return withTimeout(
				this.connectSSE(),
				this.options.requestTimeoutMs,
				'SSE connection',
			);
		}
	}

	async ping(): Promise<void> {
		if (this.closed) throw new Error('BridgeClosedError: bridge is closed');
		// lightweight JSON-RPC style ping
		await this.forward({ id: '__ping', method: 'ping', params: {} });
	}

	private connectSSE(): Promise<void> {
		return new Promise((resolve, reject) => {
			const url = new URL(this.options.httpEndpoint);
			const isHttps = url.protocol === 'https:';
			const httpModule = isHttps ? https : http;

			const options = {
				hostname: url.hostname,
				port: url.port || (isHttps ? 443 : 80),
				path: url.pathname,
				method: 'GET',
				headers: {
					Accept: 'text/event-stream',
					'Cache-Control': 'no-cache',
				},
			};

			this.sseClient = httpModule.request(options, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`SSE connection failed: ${res.statusCode}`));
					return;
				}

				res.setEncoding('utf8');

				let buffer = '';
				res.on('data', (chunk) => {
					buffer += chunk;
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							try {
								const parsed = JSON.parse(data);
								this.emit('event', parsed);
							} catch {
								// Ignore invalid JSON
							}
						}
					}
				});

				res.on('end', () => {
					this.emit('close');
				});

				resolve();
			});

			this.sseClient.on('error', reject);
			this.sseClient.end();
		});
	}

	async start(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		// Line-buffered stdin processing to safely handle partial/multiple frames
		let buffer = '';
		this.stdin.on('data', (chunk) => {
			buffer += chunk.toString();
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? '';
			lines.forEach((raw) => {
				void this.processInputLine(raw);
			});
		});
	}

	private async processInputLine(raw: string): Promise<void> {
		const line = raw.trim();
		if (!line) return;
		try {
			const request = JSON.parse(line);
			const response = await withTimeout(
				this.forward(request),
				this.options.requestTimeoutMs,
				'forward request',
			);
			this.stdout.write(`${JSON.stringify(response)}\n`);
		} catch (error) {
			let id: string | number | null = null;
			try {
				const maybe = JSON.parse(line);
				if (maybe && typeof maybe === 'object' && 'id' in maybe) {
					const candidate = (maybe as Record<string, unknown>).id;
					if (typeof candidate === 'string' || typeof candidate === 'number') {
						id = candidate;
					}
				}
			} catch {
				// ignore secondary parse failure
			}
			const errorResponse = {
				id,
				error: {
					code: -32700,
					message: 'Parse error',
					data: error instanceof Error ? error.message : String(error),
				},
			};
			this.stdout.write(`${JSON.stringify(errorResponse)}\n`);
		}
	}

	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		this.isRunning = false;

		if (this.sseClient) {
			this.sseClient.destroy();
			this.sseClient = undefined;
		}

		if (this.rateLimiter) {
			this.rateLimiter.reset();
		}

		if (this.circuitBreaker) {
			this.circuitBreaker.reset();
		}

		this.removeAllListeners();
	}
}
