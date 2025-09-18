export function inproc() {
	const subs = new Map();
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
//# sourceMappingURL=inproc.js.map
