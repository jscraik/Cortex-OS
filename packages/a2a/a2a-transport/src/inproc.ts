import type { Envelope } from '@cortex-os/a2a-contracts';
import type { Transport } from '@cortex-os/a2a-core/transport';

export function inproc(): Transport {
	const subs = new Map<string, Set<(m: Envelope) => Promise<void>>>();
	return {
		async publish(m) {
			const handlers = subs.get(m.type);
			if (!handlers) {
				return;
			}
			for (const handler of handlers) {
				try {
					await handler(m);
				} catch (error) {
					console.error(
						`[A2A In-Process Transport] Error in handler for message type ${m.type}:`,
						error,
					);
				}
			}
		},
		async subscribe(types, onMsg) {
			for (const t of types) subs.set(t, (subs.get(t) ?? new Set()).add(onMsg));
			return async () => {
				for (const t of types) subs.get(t)?.delete(onMsg);
			};
		},
	};
}
