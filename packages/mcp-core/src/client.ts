import { spawn } from 'node:child_process';
import type WebSocket from 'ws';
import { z } from 'zod';
import type { ServerInfo } from './contracts.js';
import { ServerInfoSchema } from './contracts.js';

// Lazy require to avoid adding overhead when ws not used at runtime bundlers can tree-shake
let WSImpl: typeof WebSocket | undefined;
function getWebSocket(): typeof WebSocket {
	if (!WSImpl) {
		WSImpl = require('ws');
	}
	if (!WSImpl) {
		throw new Error('Failed to load ws module');
	}
	return WSImpl;
}

export interface EnhancedClient {
	callTool(input: { name: string; arguments?: unknown }): Promise<unknown>;
	ping(): Promise<void>;
	close(): Promise<void>;
}

export class TimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TimeoutError';
	}
}

function withTimeout<T>(
	p: Promise<T>,
	ms: number | undefined,
	label: string,
): Promise<T> {
	if (!ms || ms <= 0) return p;
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new TimeoutError(`${label} timed out after ${ms}ms`)),
			ms,
		);
		p.then(
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

const ToolRequestSchema = z.object({
	name: z.string(),
	arguments: z.unknown().optional(),
});

export async function createEnhancedClient(
	si: ServerInfo & { requestTimeoutMs?: number },
): Promise<EnhancedClient> {
	const server = ServerInfoSchema.parse(si);

	class ClientClosedError extends Error {
		constructor() {
			super('Client is closed');
			this.name = 'ClientClosedError';
		}
	}
	let closed = false;

	switch (server.transport) {
		case 'http':
		case 'sse':
		case 'streamableHttp': {
			if (!server.endpoint) {
				throw new Error('endpoint required for http transports');
			}
			const endpoint = server.endpoint; // safe after guard
			return {
				async callTool(input) {
					if (closed) throw new ClientClosedError();
					const payload = ToolRequestSchema.parse(input);
					return await withTimeout(
						(async () => {
							const res = await fetch(endpoint, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									...(server.headers ?? {}),
								},
								body: JSON.stringify(payload),
							});
							if (!res.ok) {
								throw new Error(`HTTP ${res.status}`);
							}
							return await res.json();
						})(),
						si.requestTimeoutMs,
						'HTTP tool call',
					);
				},
				async ping() {
					if (closed) throw new ClientClosedError();
					// lightweight round-trip: POST minimal ping payload; ignore body content
					await withTimeout(
						(async () => {
							const res = await fetch(endpoint, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									...(server.headers ?? {}),
								},
								body: JSON.stringify({ name: 'ping' }),
							});
							if (!res.ok) throw new Error(`HTTP ${res.status}`);
							await res.text();
						})(),
						si.requestTimeoutMs,
						'HTTP ping',
					);
				},
				async close() {
					closed = true;
				},
			};
		}
		case 'ws': {
			if (!server.endpoint)
				throw new Error('endpoint required for ws transport');
			const WS = getWebSocket();
			const socket = new WS(server.endpoint);
			let open = false;
			let idCounter = 0;
			const pending = new Map<
				number,
				{ resolve: (v: unknown) => void; reject: (e: unknown) => void }
			>();

			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(
					() => reject(new Error('WebSocket open timeout')),
					si.requestTimeoutMs ?? 5000,
				);
				socket.on('open', () => {
					open = true;
					clearTimeout(timer);
					resolve();
				});
				socket.on('error', (e: unknown) => {
					clearTimeout(timer);
					reject(e instanceof Error ? e : new Error(String(e)));
				});
			});

			socket.on('message', (data: WebSocket.RawData) => {
				try {
					const msg = JSON.parse(data.toString());
					if (msg && typeof msg.id === 'number' && pending.has(msg.id)) {
						const ticket = pending.get(msg.id);
						if (ticket) ticket.resolve(msg.result ?? msg);
						pending.delete(msg.id);
					}
				} catch {
					// swallow parse errors (non-JSON frames) – acceptable for loose protocol
				}
			});
			socket.on('close', () => {
				if (closed) return;
				closed = true;
				const err = new ClientClosedError();
				for (const [, ticket] of pending) ticket.reject(err);
				pending.clear();
			});

			return {
				async callTool(input) {
					if (closed) throw new ClientClosedError();
					if (!open) throw new Error('WebSocket not open');
					const payload = ToolRequestSchema.parse(input);
					const id = ++idCounter;
					const frame = {
						id,
						name: payload.name,
						arguments: payload.arguments,
					};
					return await withTimeout(
						new Promise((resolve, reject) => {
							pending.set(id, { resolve, reject });
							socket.send(JSON.stringify(frame), (err?: Error) => {
								if (err) reject(err);
							});
						}),
						si.requestTimeoutMs,
						'ws tool call',
					);
				},
				async ping() {
					if (closed) throw new ClientClosedError();
					if (!open) throw new Error('WebSocket not open');
					// send ping frame with id 0 (not tracked) or WebSocket ping
					await new Promise<void>((resolve, reject) => {
						try {
							socket.ping?.();
							resolve();
						} catch (e) {
							reject(e instanceof Error ? e : new Error(String(e)));
						}
					});
				},
				async close() {
					if (closed) return;
					closed = true;
					const err = new ClientClosedError();
					for (const [, ticket] of pending) ticket.reject(err);
					pending.clear();
					socket.close();
				},
			};
		}
		case 'stdio': {
			if (!server.command) {
				throw new Error('command required for stdio transport');
			}

			const child = spawn(server.command, server.args ?? [], {
				env: { ...process.env, ...(server.env ?? {}) },
			});

			let buffer = '';
			const pending: {
				resolve: (v: unknown) => void;
				reject: (e: unknown) => void;
			}[] = [];

			child.stdout.on('data', (chunk) => {
				buffer += chunk.toString();
				const lines = buffer.split(/\r?\n/);
				buffer = lines.pop() ?? '';
				for (const raw of lines) {
					if (!raw.trim()) continue;
					const ticket = pending.shift();
					try {
						const parsed = JSON.parse(raw);
						if (ticket) ticket.resolve(parsed);
					} catch (err) {
						if (ticket) ticket.reject(err);
					}
				}
			});

			child.on('error', (err) => {
				while (pending.length) pending.shift()?.reject(err);
			});
			child.on('exit', (code, signal) => {
				if (code && code !== 0) {
					const err = new Error(
						`child process exited with error (code=${code} signal=${signal ?? 'null'})`,
					);
					while (pending.length) pending.shift()?.reject(err);
					return;
				}
				if (!pending.length) return; // graceful exit, nothing pending
				queueMicrotask(() => {
					while (pending.length)
						pending
							.shift()
							?.reject(
								new Error('child exited before responding to all requests'),
							);
				});
			});

			return {
				async callTool(input) {
					if (closed) throw new ClientClosedError();
					const payload = ToolRequestSchema.parse(input);
					return await withTimeout(
						new Promise((resolve, reject) => {
							pending.push({ resolve, reject });
							child.stdin.write(`${JSON.stringify(payload)}\n`);
						}),
						si.requestTimeoutMs,
						'stdio tool call',
					);
				},
				async ping() {
					if (closed) throw new ClientClosedError();
				},
				async close() {
					if (closed) return;
					closed = true;
					// reject all pending first with closed error
					const err = new ClientClosedError();
					while (pending.length) pending.shift()?.reject(err);
					child.kill();
				},
			};
		}
		default:
			throw new Error(`Unsupported transport: ${server.transport}`);
	}
}
