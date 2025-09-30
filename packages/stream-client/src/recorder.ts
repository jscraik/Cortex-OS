import type { StreamEvent, StreamLane } from '@cortex-os/protocol';
import type { EventRecorder } from './types.js';

interface RecordedPacket {
	lane: StreamLane;
	events: StreamEvent[];
	at: string;
}

export const createEventRecorder = (): EventRecorder => {
	const packets: RecordedPacket[] = [];
	return {
		record(lane: StreamLane, events: StreamEvent[]): void {
			packets.push({
				lane,
				events: events.map((event) => ({ ...event })),
				at: new Date().toISOString(),
			});
		},
		export(): ReadonlyArray<RecordedPacket> {
			return packets.map((packet) => ({
				lane: packet.lane,
				events: packet.events.map((event) => ({ ...event })),
				at: packet.at,
			}));
		},
		clear(): void {
			packets.length = 0;
		},
	};
};
