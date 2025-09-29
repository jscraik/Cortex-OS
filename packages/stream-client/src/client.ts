import NodeEventSource from 'eventsource';
import { StreamEventSchema } from '@cortex-os/protocol';
import type { StreamEvent, StreamLane } from '@cortex-os/protocol';
import type { ClientOptions, ReconnectPolicy, StreamConnection, StreamHandlers } from './types.js';

interface EventSourceMessage {
	data: string;
}

interface EventSourceLike {
	readonly OPEN: number;
	readonly readyState: number;
	onopen: (() => void) | null;
	onerror: (() => void) | null;
	addEventListener(type: string, listener: (event: EventSourceMessage) => void): void;
	close(): void;
}

type EventSourceCtor = new (url: string) => EventSourceLike;

const LANES: StreamLane[] = ['hot', 'heavy'];

const DEFAULT_RECONNECT: Required<ReconnectPolicy> = {
	initialDelayMs: 500,
	maxDelayMs: 10_000,
	multiplier: 2,
	maxAttempts: Number.POSITIVE_INFINITY,
};

const resolveEventSource = (options: ClientOptions): EventSourceCtor => {
	if (options.EventSourceImpl) {
		return options.EventSourceImpl as unknown as EventSourceCtor;
	}
	const globalCtor = (globalThis as unknown as { EventSource?: EventSourceCtor }).EventSource;
	if (typeof globalCtor === 'function') {
		return globalCtor;
	}
	return NodeEventSource as unknown as EventSourceCtor;
};

const chooseLanes = (options: ClientOptions): StreamLane[] => options.lanes ?? LANES;

const normaliseReconnect = (policy?: ReconnectPolicy): Required<ReconnectPolicy> => ({
	initialDelayMs: policy?.initialDelayMs ?? DEFAULT_RECONNECT.initialDelayMs,
	maxDelayMs: policy?.maxDelayMs ?? DEFAULT_RECONNECT.maxDelayMs,
	multiplier: policy?.multiplier ?? DEFAULT_RECONNECT.multiplier,
	maxAttempts: policy?.maxAttempts ?? DEFAULT_RECONNECT.maxAttempts,
});

const computeDelay = (attempt: number, policy: Required<ReconnectPolicy>): number => {
	const growth = policy.initialDelayMs * policy.multiplier ** attempt;
	return Math.min(policy.maxDelayMs, growth);
};

class StreamClient implements StreamConnection {
	private readonly handlers: StreamHandlers;
	private readonly options: ClientOptions;
	private readonly lanes: StreamLane[];
	private readonly reconnect: Required<ReconnectPolicy>;
	private attempts = 0;
	private closed = false;
	private es?: EventSourceLike;

	public constructor(private readonly url: string, handlers: StreamHandlers, options: ClientOptions = {}) {
		this.handlers = handlers;
		this.options = options;
		this.lanes = chooseLanes(options);
		this.reconnect = normaliseReconnect(options.reconnect);
		this.connect();
	}

	public close(): void {
		this.closed = true;
		if (this.es) {
			this.es.close();
			this.es = undefined;
		}
		this.handlers.onStatusChange?.('closed');
	}

	public isOpen(): boolean {
		return Boolean(this.es && this.es.readyState === this.es.OPEN);
	}

	private connect(): void {
		if (this.closed) {
			return;
		}
		this.handlers.onStatusChange?.('connecting');
		if (this.options.transport === 'ws') {
			this.connectWebSocket();
			return;
		}
		this.connectSSE();
	}

	private connectSSE(): void {
		const EventSourceImpl = resolveEventSource(this.options);
		const source: EventSourceLike = new EventSourceImpl(this.buildUrl());
		this.es = source;
		source.onopen = () => {
			this.handlers.onStatusChange?.('open');
			this.attempts = 0;
		};
		source.onerror = () => {
			this.handlers.onStatusChange?.('error');
			this.scheduleReconnect(new Error('SSE connection lost'));
		};
		for (const lane of this.lanes) {
			source.addEventListener(lane, (event: EventSourceMessage) => {
				this.dispatchPacket(lane, event.data);
			});
		}
	}

	// Placeholder for future WS support; falls back to SSE today.
	private connectWebSocket(): void {
		this.connectSSE();
	}

	private dispatchPacket(lane: StreamLane, raw: string): void {
		try {
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) {
				throw new Error('Stream payload must be an array');
			}
			const events: StreamEvent[] = parsed.map((item) => StreamEventSchema.parse(item));
			this.handlers.onPacket?.(lane, events);
			for (const event of events) {
				this.handlers.onEvent?.(event);
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.handlers.onError?.(err);
		}
	}

	private scheduleReconnect(error: Error): void {
		if (this.closed) {
			return;
		}
		this.handlers.onError?.(error);
		if (this.attempts >= this.reconnect.maxAttempts) {
			this.handlers.onStatusChange?.('closed');
			return;
		}
		const delay = computeDelay(this.attempts, this.reconnect);
		this.attempts += 1;
		setTimeout(() => {
			if (this.closed) {
				return;
			}
			this.connect();
		}, delay).unref?.();
	}

	private buildUrl(): string {
		if (!this.lanes.length) {
			return this.url;
		}
		const url = new URL(this.url);
		url.searchParams.set('lanes', this.lanes.join(','));
		return url.toString();
	}
}

export const connectStream = (
	url: string,
	handlers: StreamHandlers = {},
	options: ClientOptions = {},
): StreamConnection => new StreamClient(url, handlers, options);
