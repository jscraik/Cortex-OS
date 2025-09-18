import { randomUUID } from 'node:crypto';
import type { Memory, MemoryService } from '@cortex-os/memories';

export type MemoriesBridge = {
	checkpoint: (runId: string, data: unknown) => Promise<Awaited<ReturnType<MemoryService['save']>>>;
};

export const createMemoriesBridge = (mem: MemoryService): MemoriesBridge => ({
	checkpoint: async (runId, data) => {
		const id = `wf:${runId}:${randomUUID()}`;
		const seen = new WeakSet<object>();
		const safeString = (() => {
			try {
				return JSON.stringify(data, (_, value) => {
					if (typeof value === 'object' && value !== null) {
						if (seen.has(value as object)) return '[Circular]';
						seen.add(value as object);
					}
					return value;
				});
			} catch {
				return String(data);
			}
		})();
		const entry: Memory = {
			id,
			kind: 'artifact',
			text: safeString,
			tags: ['orchestrator', 'checkpoint'],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: { source: 'system' },
		};
		return mem.save(entry);
	},
});
