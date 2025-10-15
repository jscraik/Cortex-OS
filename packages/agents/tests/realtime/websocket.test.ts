import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketServer } from '../../src/realtime/websocket.js';

if (!(globalThis as { WebSocket?: typeof WebSocket }).WebSocket) {
	(globalThis as any).WebSocket = class {
		static readonly OPEN = 1;
		static readonly CLOSED = 3;
		close() {}
	} as typeof WebSocket;
}

class FakeSocket {
	public readyState = WebSocket.OPEN;
	public sent: unknown[] = [];
	public closed: { code: number; reason?: string } | null = null;
	public onmessage: ((event: { data: { size: number; toString(): string } }) => void) | null = null;
	public onclose: ((event: { code: number; reason?: string }) => void) | null = null;
	public onerror: ((error: unknown) => void) | null = null;

	send(payload: string): void {
		this.sent.push(JSON.parse(payload));
	}

	close(code?: number, reason?: string): void {
		this.closed = { code: code ?? 1000, reason };
		this.readyState = WebSocket.CLOSED;
		this.onclose?.({ code: code ?? 1000, reason });
	}

	emitMessage(message: unknown): void {
		const raw = JSON.stringify(message);
		this.onmessage?.({
			data: {
				size: raw.length,
				toString: () => raw,
			},
		});
	}

	emitError(error: unknown): void {
		this.onerror?.(error);
	}
}

function createRequest(path: string): Request {
	return new Request(`http://localhost${path}`);
}

describe('WebSocketServer', () => {
	let server: WebSocketServer;
	let authenticate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		authenticate = vi.fn().mockResolvedValue({ userId: 'user-1', permissions: ['read'] });
		server = new WebSocketServer({
			path: '/ws',
			port: 0,
			authenticate,
			pingInterval: 0,
		});
		server.on('error', () => {});
	});

	afterEach(() => {
		server.close();
	});

	it('authenticates connections and sends welcome message', async () => {
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/ws?token=abc'));

		expect(authenticate).toHaveBeenCalledWith('abc');
		expect(socket.sent).toHaveLength(1);
		expect(socket.sent[0]).toMatchObject({ type: 'connected' });
		server.close();
	});

	it('closes connection when path is invalid', async () => {
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/invalid?token=abc'));

		expect(authenticate).not.toHaveBeenCalled();
		expect(socket.closed).toEqual({ code: 4000, reason: 'Invalid path' });
	});

	it('requires authentication token', async () => {
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/ws'));

		expect(authenticate).not.toHaveBeenCalled();
		expect(socket.closed).toEqual({ code: 4001, reason: 'Authentication required' });
	});

	it('closes connection when authentication fails', async () => {
		authenticate.mockRejectedValueOnce(new Error('Invalid token'));
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/ws?token=nope'));

		expect(authenticate).toHaveBeenCalledWith('nope');
		expect(socket.closed).toEqual({ code: 4001, reason: 'Authentication failed' });
	});

	it('processes subscription messages and sends acknowledgements', async () => {
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/ws?token=abc'));

		socket.emitMessage({
			type: 'subscribe',
			payload: { subscriptionType: 'langgraph', filter: { runId: 'run-1' } },
		});

		expect(socket.sent.at(-1)).toMatchObject({
			type: 'subscribed',
			payload: { subscriptionType: 'langgraph', filter: { runId: 'run-1' } },
		});
	});

	it('emits errors for oversized messages', async () => {
		const socket = new FakeSocket();
		await server.handleConnection(socket as unknown as WebSocket, createRequest('/ws?token=abc'));

		const huge = 'x'.repeat(2 * 1024 * 1024);
		const errors: Error[] = [];
		server.on('error', (err) => errors.push(err));

		socket.emitMessage({ type: 'chat', payload: huge });

		expect(socket.sent.at(-1)).toMatchObject({
			type: 'error',
			payload: { code: 'MESSAGE_TOO_LARGE' },
		});
		expect(errors).toHaveLength(0);
	});
});
