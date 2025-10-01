import { createEnvelope } from '@cortex-os/a2a-contracts';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { CORTEX_OS_EVENT_SOURCE, createCortexOsBus } from '../a2a.js';

export interface Envelope {
	id: string;
	type: string;
	occurredAt: string;
	ttlMs: number;
	headers: Record<string, unknown>;
	payload: Record<string, unknown>;
	source?: string;
}

export interface Handler {
	type: string;
	handle: (env: Envelope) => Promise<void> | void;
}

export interface A2AWiring {
	publish: (type: string, payload: Record<string, unknown>, source?: string) => Promise<void>;
	on: (type: string, handler: Handler['handle']) => Promise<() => Promise<void>>;
	emit: (envelope: Envelope) => void;
	publishMcpEvent: (evt: { type: string; payload: Record<string, unknown> }) => Promise<void>;
	publishToolEvent: (evt: { type: string; payload: Record<string, unknown> }) => Promise<void>;
}

export function wireA2A(): A2AWiring {
	const { bus } = createCortexOsBus();

	const publish = async (
		type: string,
		payload: Record<string, unknown>,
		source = CORTEX_OS_EVENT_SOURCE,
	) => {
		const envelope = createEnvelope({
			type,
			source,
			data: payload,
		});
		await bus.publish(envelope);
	};

	const on = async (type: string, handler: Handler['handle']) => {
		const unsubscribe = await bus.bind([
			{
				type,
				handle: async (msg: A2AEventEnvelope) => {
					const envelope: Envelope = {
						id: msg.id,
						type: msg.type,
						payload: (msg.data as Record<string, unknown>) ?? {},
						source: msg.source,
						occurredAt: msg.time ?? new Date().toISOString(),
						ttlMs: msg.ttlMs ?? 60_000,
						headers: msg.headers ?? {},
					};
					await handler(envelope);
				},
			},
		]);
		return unsubscribe;
	};

	const emit = (envelope: Envelope) => {
		void publish(envelope.type, envelope.payload, envelope.source);
	};

	const publishMcpEvent = async (evt: { type: string; payload: Record<string, unknown> }) => {
		await publish('cortex.mcp.event', {
			type: evt.type,
			payload: evt.payload,
			timestamp: Date.now(),
		});
	};

	const publishToolEvent = async (evt: { type: string; payload: Record<string, unknown> }) => {
		await publish(evt.type, evt.payload);
	};

	return { publish, on, emit, publishMcpEvent, publishToolEvent };
}

export const healthHandler: Handler = {
	type: 'cortex.health.check',
	handle: async () => { },
};
