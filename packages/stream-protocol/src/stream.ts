import type { StreamEvent, StreamLane } from '@cortex-os/protocol';
import type { FlushPacket, StreamConfig, StreamListener, StreamMultiplexer } from './types.js';

const DEFAULT_CONFIG: Required<Pick<StreamConfig, 'hotFlushMs' | 'heavyFlushMs' | 'bufferLimit'>> = {
	hotFlushMs: 25,
	heavyFlushMs: 250,
	bufferLimit: 2_000,
};

const defaultCategorize = (event: StreamEvent): StreamLane => (event.type === 'token' ? 'hot' : 'heavy');

const clonePacket = (lane: StreamLane, events: StreamEvent[]): FlushPacket => ({
	lane,
	events: events.map((event) => ({ ...event })),
});

class StreamMultiplexerImpl implements StreamMultiplexer {
	private readonly listeners = new Set<StreamListener>();
	private readonly buffers: Record<StreamLane, StreamEvent[]> = { hot: [], heavy: [] };
	private readonly timers: Record<StreamLane, NodeJS.Timeout | undefined> = { hot: undefined, heavy: undefined };
	private readonly history: StreamEvent[] = [];
	private readonly limits: Required<Pick<StreamConfig, 'hotFlushMs' | 'heavyFlushMs' | 'bufferLimit'>>;
	private readonly categorize: (event: StreamEvent) => StreamLane;

	public constructor(config: StreamConfig = {}) {
		this.limits = { ...DEFAULT_CONFIG, ...config };
		this.categorize = config.categorize ?? defaultCategorize;
	}

	public publish(event: StreamEvent): void {
		const lane = this.categorize(event);
		this.buffers[lane].push(event);
		this.history.push(event);
		if (this.history.length > this.limits.bufferLimit) {
			this.history.shift();
		}
		const delay = lane === 'hot' ? this.limits.hotFlushMs : this.limits.heavyFlushMs;
		this.scheduleFlush(lane, delay);
	}

	public subscribe(listener: StreamListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	public snapshot(): StreamEvent[] {
		return this.history.map((event) => ({ ...event }));
	}

	public close(): void {
		for (const lane of Object.keys(this.timers) as StreamLane[]) {
			const timer = this.timers[lane];
			if (timer) {
				clearTimeout(timer);
			}
		}
		this.listeners.clear();
	}

	private scheduleFlush(lane: StreamLane, delay: number): void {
		if (this.timers[lane]) {
			return;
		}
		this.timers[lane] = setTimeout(() => {
			this.timers[lane] = undefined;
			this.flush(lane);
		}, delay);
	}

	private flush(lane: StreamLane): void {
		const batch = this.buffers[lane];
		if (batch.length === 0) {
			return;
		}
		const packet = clonePacket(lane, batch.splice(0, batch.length));
		for (const listener of this.listeners) {
			listener(packet);
		}
	}
}

export const makeStream = (config: StreamConfig = {}): StreamMultiplexer => new StreamMultiplexerImpl(config);
