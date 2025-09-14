import { EventEmitter } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import { Readable, Writable } from 'node:stream';
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
	error: z.object({
		code: z.number(),
		message: z.string(),
		data: z.any().optional(),
	}).optional(),
});

type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

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
}

// Rate limiter implementation
class RateLimiter {
	private requests: number[] = [];

	constructor(private options: RateLimitOptions) {}

	canMakeRequest(): boolean {
		const now = Date.now();
		const windowStart = now - this.options.windowMs;

		// Clean old requests
		this.requests = this.requests.filter(time => time > windowStart);

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

	constructor(private options: CircuitBreakerOptions) {}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === 'open') {
			const now = Date.now();
			if (now - this.lastFailureTime > this.options.resetTimeout) {
				this.state = 'half-open';
			} else {
				throw new Error('Circuit breaker is open');
			}
		}

		try {
			const result = await fn();
			if (this.state === 'half-open') {
				this.state = 'closed';
				this.failures = 0;
			}
			return result;
		} catch (error) {
			this.failures++;
			this.lastFailureTime = Date.now();

			if (this.failures >= this.options.failureThreshold) {
				this.state = 'open';
			}

			throw error;
		}
	}

	reset(): void {
		this.state = 'closed';
		this.failures = 0;
		this.lastFailureTime = 0;
	}
}

// Main bridge implementation
export class StdioHttpBridge extends EventEmitter {
	private rateLimiter?: RateLimiter;
	private circuitBreaker?: CircuitBreaker;
	private stdin: Readable;
	private stdout: Writable;
	private sseClient?: http.ClientRequest;
	private isRunning = false;

	constructor(private options: StdioHttpBridgeOptions) {
		super();

		this.stdin = options.stdin || process.stdin;
		this.stdout = options.stdout || process.stdout;

		if (options.enableRateLimiting) {
			this.rateLimiter = new RateLimiter(
				options.rateLimitOptions || {
					maxRequests: 10,
					windowMs: 1000,
				}
			);
		}

		if (options.circuitBreakerOptions) {
			this.circuitBreaker = new CircuitBreaker(options.circuitBreakerOptions);
		}
	}

	async forward(request: JsonRpcRequest): Promise<JsonRpcResponse> {
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

	private async sendHttpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
		const retryOptions = this.options.retryOptions || {
			maxRetries: 0,
			retryDelay: 1000,
		};

		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
			try {
				return await this.makeHttpRequest(request);
			} catch (error) {
				lastError = error as Error;

				if (attempt < retryOptions.maxRetries) {
					// Exponential backoff
					const delay = Math.min(
						retryOptions.retryDelay * Math.pow(2, attempt),
						retryOptions.maxDelay || 30000
					);
					await new Promise(resolve => setTimeout(resolve, delay));
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
					if (res.statusCode && res.statusCode >= 500) {
						reject(new Error(`Server error: ${res.statusCode}`));
						return;
					}

					try {
						const response = JSON.parse(data);
						const validated = JsonRpcResponseSchema.parse(response);
						resolve(validated);
					} catch (error) {
						reject(new Error(`Invalid response: ${error}`));
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
			return this.connectSSE();
		}
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
					'Accept': 'text/event-stream',
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
							} catch (error) {
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

		// Set up stdin listener
		this.stdin.on('data', async (data) => {
			try {
				const request = JSON.parse(data.toString());
				const response = await this.forward(request);
				this.stdout.write(JSON.stringify(response) + '\n');
			} catch (error) {
				const errorResponse = {
					id: null,
					error: {
						code: -32700,
						message: 'Parse error',
						data: error instanceof Error ? error.message : String(error),
					},
				};
				this.stdout.write(JSON.stringify(errorResponse) + '\n');
			}
		});
	}

	async close(): Promise<void> {
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