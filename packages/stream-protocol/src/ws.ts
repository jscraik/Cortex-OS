import { StreamEventSchema } from '@cortex-os/protocol';
import type { FlushPacket, StreamMultiplexer, WebSocketLike, WSOptions } from './types.js';

const defaultSerializer = (packet: FlushPacket): string =>
	JSON.stringify({ lane: packet.lane, events: packet.events });

const lanesMatch = (packet: FlushPacket, lanes?: string[]): boolean => {
	if (!lanes || lanes.length === 0) {
		return true;
	}
	return lanes.includes(packet.lane);
};

const listenOnce = (socket: WebSocketLike, event: 'close' | 'error', handler: () => void): void => {
	if (typeof socket.addEventListener === 'function') {
		socket.addEventListener(event, handler);
		return;
	}
	if (typeof socket.on === 'function') {
		socket.on(event, handler);
	}
};

const removeListener = (
	socket: WebSocketLike,
	event: 'close' | 'error',
	handler: () => void,
): void => {
	if (typeof socket.removeEventListener === 'function') {
		socket.removeEventListener(event, handler);
		return;
	}
	if (typeof socket.off === 'function') {
		socket.off(event, handler);
	}
};

export const createWSHandler =
	(stream: StreamMultiplexer, options: WSOptions = {}) =>
	(socket: WebSocketLike): void => {
		if (socket.readyState !== socket.OPEN) {
			return;
		}
		const serializer = options.serializer ?? defaultSerializer;
		const lanes = options.lanes;
		const listener = (packet: FlushPacket): void => {
			if (!lanesMatch(packet, lanes)) {
				return;
			}
			for (const event of packet.events) {
				StreamEventSchema.parse(event);
			}
			socket.send(serializer(packet));
		};
		const unsubscribe = stream.subscribe(listener);
		const handleClose = (): void => {
			unsubscribe();
			removeListener(socket, 'close', handleClose);
			removeListener(socket, 'error', handleClose);
		};
		listenOnce(socket, 'close', handleClose);
		listenOnce(socket, 'error', handleClose);
	};
