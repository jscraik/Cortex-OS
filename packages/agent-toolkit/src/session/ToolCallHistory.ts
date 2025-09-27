export interface ToolCallEntry<T = unknown> {
	id: string;
	payload: T;
	createdAt: number;
	tokenCount?: number;
}

export interface ToolCallHistoryOptions {
	maxEntries?: number; // soft max before compaction
}

const shouldCompact = (len: number, maxEntries: number): boolean => len > maxEntries * 1.5;

const compactByDroppingOldest = <T>(items: ToolCallEntry<T>[], maxEntries: number) => {
	if (items.length <= maxEntries) return items;
	const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
	return sorted.slice(sorted.length - maxEntries);
};

export const createToolCallHistory = <T = unknown>(opts?: ToolCallHistoryOptions) => {
	const maxEntries = opts?.maxEntries ?? 2000;
	let entries: ToolCallEntry<T>[] = [];

	const addCall = (id: string, payload: T, tokenCount?: number): ToolCallEntry<T> => {
		const entry: ToolCallEntry<T> = {
			id,
			payload,
			createdAt: Date.now(),
			tokenCount,
		};
		entries.push(entry);
		if (shouldCompact(entries.length, maxEntries)) {
			entries = compactByDroppingOldest(entries, maxEntries);
		}
		return entry;
	};

	const list = () => [...entries];
	const size = () => entries.length;
	const clear = () => {
		entries = [];
	};

	return { addCall, list, size, clear };
};

export type ToolCallHistory<T = unknown> = ReturnType<typeof createToolCallHistory<T>>;
