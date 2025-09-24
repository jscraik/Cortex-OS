import { randomUUID } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { RuntimeHttpServer } from '../http/runtime-server.js';
import { ensureStateDir, getStatePath } from '../platform/xdg.js';
import { withRuntimeSpan } from '../telemetry/tracing.js';

export interface RuntimeEvent {
	id: string;
	type: string;
	data: Record<string, unknown>;
	timestamp: string;
}

export interface EventManagerOptions {
	httpServer: RuntimeHttpServer;
	maxBufferedEvents?: number;
	ledgerFilename?: string;
}

export interface EventManager {
	emitEvent(
		event: Omit<RuntimeEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
	): Promise<void>;
	getRecentEvents(): RuntimeEvent[];
}

const DEFAULT_LEDGER = 'events/ledger.ndjson';
const DEFAULT_MAX_EVENTS = 1000;

export function createEventManager({
	httpServer,
	maxBufferedEvents = DEFAULT_MAX_EVENTS,
	ledgerFilename = DEFAULT_LEDGER,
}: EventManagerOptions): EventManager {
	const buffer: RuntimeEvent[] = [];

	async function writeToLedger(event: RuntimeEvent) {
		await ensureStateDir();
		const ledgerParts = ledgerFilename.split('/');
		if (ledgerParts.length > 1) {
			const dir = join(getStatePath(), ...ledgerParts.slice(0, -1));
			await mkdir(dir, { recursive: true });
		}
		const path = getStatePath(...ledgerParts);
		await appendFile(path, `${JSON.stringify(event)}\n`, 'utf-8');
	}

	async function emitEvent(
		event: Omit<RuntimeEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
	) {
		const fullEvent: RuntimeEvent = {
			id: event.id ?? randomUUID(),
			type: event.type,
			data: event.data,
			timestamp: event.timestamp ?? new Date().toISOString(),
		};

		await withRuntimeSpan(
			'events.emit',
			async (span) => {
				span.setAttribute('event.type', fullEvent.type);
				span.setAttribute('event.id', fullEvent.id);

				buffer.push(fullEvent);
				if (buffer.length > maxBufferedEvents) {
					buffer.splice(0, buffer.length - maxBufferedEvents);
				}

				await writeToLedger(fullEvent);
				httpServer.broadcast({ type: fullEvent.type, data: fullEvent });
			},
			{ 'event.type': fullEvent.type },
		);
	}

	return {
		emitEvent,
		getRecentEvents() {
			return [...buffer];
		},
	};
}
