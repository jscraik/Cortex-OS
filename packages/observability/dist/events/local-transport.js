/**
 * Minimal in-memory Transport for observability events to avoid cross-package cycles.
 * Not intended for cross-process use; suitable for local testing/default wiring.
 */
export const createLocalTransport = () => {
	const subs = new Map();
	const publish = async (m) => {
		const handlers = subs.get(m.type);
		if (!handlers?.size) return;
		// Deliver to all handlers sequentially to keep ordering deterministic
		for (const fn of handlers) {
			await fn(m);
		}
	};
	const subscribe = async (types, onMsg) => {
		for (const t of types) {
			const set = subs.get(t) ?? new Set();
			set.add(onMsg);
			subs.set(t, set);
		}
		return async () => {
			for (const t of types) {
				const set = subs.get(t);
				set?.delete(onMsg);
				if (!set || set.size === 0) subs.delete(t);
			}
		};
	};
	return {
		publish,
		subscribe,
	};
};
//# sourceMappingURL=local-transport.js.map
