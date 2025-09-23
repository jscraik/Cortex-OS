import { randomUUID } from 'node:crypto';
import type { Envelope } from '@cortex-os/a2a-contracts';
import { createEnvelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

export type MemoriesBridge = {
	checkpoint: (runId: string, data: unknown) => Promise<{ id: string; success: boolean }>;
};

export const createMemoriesBridge = (): MemoriesBridge => {
	const bus = createBus(inproc());

	return {
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

			// Create memory creation event
			const memoryEvent: Envelope = createEnvelope({
				type: 'memories.memory.created',
				source: 'urn:cortex:orchestration',
				data: {
					id,
					kind: 'artifact',
					text: safeString,
					tags: ['orchestrator', 'checkpoint'],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					provenance: { source: 'system' },
				},
			});

			// Publish the memory creation event
			try {
				await bus.publish(memoryEvent);
				return { id, success: true };
			} catch (error) {
				console.error('Failed to create memory checkpoint:', error);
				return { id, success: false };
			}
		},
	};
};
