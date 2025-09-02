export type MemoryLimits = {
	maxItems: number;
	maxBytes: number;
};

export interface MemoryStore<T = unknown> {
	limits(): MemoryLimits;
	size(): { items: number; bytes: number };
	get(key: string): T | undefined;
	set(key: string, value: T): void;
	delete(key: string): void;
	clear(): void;
	serialize(): string;
	load(serialized: string): void;
}

export function createInMemoryStore<T = unknown>(
	limits: MemoryLimits,
): MemoryStore<T> {
	const state = new Map<string, T>();
	let totalBytes = 0;

	function byteSize(v: T) {
		try {
			return Buffer.byteLength(JSON.stringify(v));
		} catch {
			return 0;
		}
	}

	function enforce() {
		while (state.size > limits.maxItems || totalBytes > limits.maxBytes) {
			const firstKey = state.keys().next().value as string | undefined;
			if (!firstKey) break;
			const old = state.get(firstKey) as T;
			totalBytes -= byteSize(old);
			state.delete(firstKey);
		}
	}

	return {
		limits: () => limits,
		size: () => ({ items: state.size, bytes: totalBytes }),
		get: (k) => state.get(k),
		set: (k, v) => {
			if (state.has(k)) {
				totalBytes -= byteSize(state.get(k) as T);
			}
			const bs = byteSize(v);
			totalBytes += bs;
			state.set(k, v);
			enforce();
		},
		delete: (k) => {
			if (state.has(k)) totalBytes -= byteSize(state.get(k) as T);
			state.delete(k);
		},
		clear: () => {
			state.clear();
			totalBytes = 0;
		},
		serialize: () =>
			JSON.stringify({ limits, entries: Array.from(state.entries()) }),
		load: (serialized) => {
			const obj = JSON.parse(serialized) as { entries: [string, T][] };
			state.clear();
			totalBytes = 0;
			for (const [k, v] of obj.entries) {
				state.set(k, v);
				totalBytes += byteSize(v);
			}
			enforce();
		},
	};
}
