import type { StreamEvent, StreamLane } from '@cortex-os/protocol';

export interface StreamHandlers {
	onEvent?: (event: StreamEvent) => void;
	onPacket?: (lane: StreamLane, events: StreamEvent[]) => void;
	onStatusChange?: (status: 'connecting' | 'open' | 'closed' | 'error') => void;
	onError?: (error: Error) => void;
}

export interface ReconnectPolicy {
	initialDelayMs?: number;
	maxDelayMs?: number;
	multiplier?: number;
	maxAttempts?: number;
}

export interface ClientOptions {
	transport?: 'sse' | 'ws';
	reconnect?: ReconnectPolicy;
	lanes?: StreamLane[];
	EventSourceImpl?: typeof EventSource;
	WebSocketImpl?: typeof WebSocket;
}

export interface StreamConnection {
	close(): void;
	isOpen(): boolean;
}

export interface EventRecorder {
	record(lane: StreamLane, events: StreamEvent[]): void;
	export(): ReadonlyArray<{ lane: StreamLane; events: StreamEvent[]; at: string }>;
	clear(): void;
}
