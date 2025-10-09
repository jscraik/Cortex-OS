import type { Envelope } from '@cortex-os/a2a-contracts';

export interface Transport {
	publish: (envelope: Envelope) => Promise<void> | void;
	subscribe: (
		types: string[],
		handler: (envelope: Envelope) => Promise<void> | void,
	) => Promise<() => Promise<void>>;
}

export function createInMemoryTransport(): Transport {
	const subs = new Map<string, Set<(envelope: Envelope) => Promise<void> | void>>();

	return {
		async publish(envelope) {
			const handlers = subs.get(envelope.type);
			if (!handlers?.size) return;
			for (const handler of handlers) {
				await handler(envelope);
			}
		},
		async subscribe(types, handler) {
			for (const type of types) {
				const set = subs.get(type) ?? new Set();
				set.add(handler);
				subs.set(type, set);
			}
			return async () => {
				for (const type of types) {
					subs.get(type)?.delete(handler);
				}
			};
		},
	};
}
