import type { StreamEvent, StreamLane } from '@cortex-os/protocol';

export interface FlushPacket {
	lane: StreamLane;
	events: StreamEvent[];
}

export type StreamListener = (packet: FlushPacket) => void;

export interface StreamMultiplexer {
	publish(event: StreamEvent): void;
	subscribe(listener: StreamListener): () => void;
	snapshot(): StreamEvent[];
	close(): void;
}

export interface StreamConfig {
	hotFlushMs?: number;
	heavyFlushMs?: number;
	categorize?: (event: StreamEvent) => StreamLane;
	bufferLimit?: number;
}

export interface SSEOptions {
	heartbeatMs?: number;
	lanes?: StreamLane[];
}

export interface WebSocketLike {
	readonly readyState: number;
	readonly OPEN: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	addEventListener?(event: 'close' | 'error', handler: () => void): void;
	removeEventListener?(event: 'close' | 'error', handler: () => void): void;
	on?(event: 'close' | 'error', handler: () => void): void;
	off?(event: 'close' | 'error', handler: () => void): void;
}

export interface WSOptions {
	lanes?: StreamLane[];
	serializer?: (packet: FlushPacket) => string;
}
