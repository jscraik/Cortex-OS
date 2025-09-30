import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamEventSchema } from '@cortex-os/protocol';
import type { FlushPacket, SSEOptions, StreamMultiplexer } from './types.js';

const serializePacket = (packet: FlushPacket): string =>
	`event: ${packet.lane}\ndata: ${JSON.stringify(packet.events)}\n\n`;

const lanesMatch = (packet: FlushPacket, lanes?: string[]): boolean => {
	if (!lanes || lanes.length === 0) {
		return true;
	}
	return lanes.includes(packet.lane);
};

const validateEvents = (packet: FlushPacket): void => {
	for (const event of packet.events) {
		StreamEventSchema.parse(event);
	}
};

export const createSSEHandler =
	(stream: StreamMultiplexer, options: SSEOptions = {}) =>
	(req: IncomingMessage, res: ServerResponse): void => {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		});
		res.write(': connected\n\n');
		const heartbeatMs = options.heartbeatMs ?? 15_000;
		const lanes = options.lanes;
		const listener = (packet: FlushPacket): void => {
			if (!lanesMatch(packet, lanes)) {
				return;
			}
			validateEvents(packet);
			res.write(serializePacket(packet));
		};
		const unsubscribe = stream.subscribe(listener);
		const heartbeat = setInterval(() => {
			res.write(': heartbeat\n\n');
		}, heartbeatMs);
		const cleanup = (): void => {
			unsubscribe();
			clearInterval(heartbeat);
			if (!res.writableEnded) {
				res.end();
			}
		};
		req.on('close', cleanup);
		req.on('error', cleanup);
	};
