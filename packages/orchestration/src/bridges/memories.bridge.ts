import type { Memory, MemoryService } from '@cortex-os/memories';
import { randomUUID } from 'node:crypto';

export type MemoriesBridge = {
	checkpoint: (
		runId: string,
		data: unknown,
	) => Promise<Awaited<ReturnType<MemoryService['save']>>>;
};

export const createMemoriesBridge = (mem: MemoryService): MemoriesBridge => ({
	checkpoint: async (runId, data) => {
		const id = `wf:${runId}:${randomUUID()}`;
		const entry: Memory = {
			id,
			kind: 'artifact',
			text: JSON.stringify(data),
			tags: ['orchestrator', 'checkpoint'],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: { source: 'system' },
		};
		return mem.save(entry);
	},
});
