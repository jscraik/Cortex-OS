import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

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
	publish: (
		type: string,
		payload: Record<string, unknown>,
		source?: string,
	) => Promise<void>;
	on: (type: string, handler: Handler['handle']) => void;
	emit: (envelope: Envelope) => void;
}

export function wireA2A(): A2AWiring {
	const emitter = new EventEmitter();

	const emit = (envelope: Envelope) => {
		emitter.emit(envelope.type, envelope);
	};

	const publish = async (
		type: string,
		payload: Record<string, unknown>,
		source = 'urn:cortex-os:runtime',
	) => {
		const envelope: Envelope = {
			id: randomUUID(),
			type,
			payload,
			source,
			occurredAt: new Date().toISOString(),
			ttlMs: 60_000,
			headers: {},
		};
		emit(envelope);
	};

	const on = (type: string, handler: Handler['handle']) => {
		emitter.on(type, (env: Envelope) => {
			void handler(env);
		});
	};

	return { publish, on, emit };
}

export const healthHandler: Handler = {
	type: 'cortex.health.check',
	handle: async () => {},
};
