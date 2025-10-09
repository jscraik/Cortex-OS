import type { Envelope } from '@cortex-os/a2a-contracts';

export interface Transport {
	publish?: (envelope: Envelope) => Promise<void>;
}

export interface BusOptions {
	tracingEnabled?: boolean;
}

type Handler = {
	type: string;
	handle: (msg: Envelope) => Promise<void> | void;
};

export function createBus(
	_transport: Transport | undefined,
	validate: (envelope: Envelope) => Envelope = (e) => e,
	_traceFactory?: unknown,
	_acl?: unknown,
	_options?: BusOptions,
) {
	const subscribers = new Map<string, Set<(msg: Envelope) => Promise<void>>>();

	return {
		async publish(envelope: Envelope) {
			const validated = validate(envelope);
			const listeners = subscribers.get(validated.type) ?? new Set();
			await Promise.all(Array.from(listeners).map((listener) => listener(validated)));
		},
		async bind(handlers: Handler[]) {
			const registrations: Array<{ type: string; listener: (msg: Envelope) => Promise<void> }> = [];
			for (const handler of handlers) {
				const listener = async (msg: Envelope) => {
					await handler.handle(validate(msg));
				};
				if (!subscribers.has(handler.type)) {
					subscribers.set(handler.type, new Set());
				}
				subscribers.get(handler.type)?.add(listener);
				registrations.push({ type: handler.type, listener });
			}
			return async () => {
				for (const { type, listener } of registrations) {
					subscribers.get(type)?.delete(listener);
				}
			};
		},
	};
}

export type { BusOptions as BusConfig };

export function createTraceContext() {
	return {
		traceId: Math.random().toString(16).slice(2),
		spanId: Math.random().toString(16).slice(2),
	};
}
