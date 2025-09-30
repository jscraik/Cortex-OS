import { describe, expect, it, vi } from 'vitest';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';
import { MemoryWorkflowEngine } from '../workflows/memoryWorkflow.js';

describe('MemoryWorkflowEngine', () => {
	it('runs the store workflow nodes sequentially', async () => {
		const callOrder: string[] = [];
		const engine = new MemoryWorkflowEngine({
			store: {
				generateId: () => {
					callOrder.push('id');
					return 'memory-001';
				},
				getTimestamp: () => {
					callOrder.push('timestamp');
					return 1_730_000_000_000;
				},
				persistMemory: vi.fn(async ({ id, input, timestamp }) => {
					callOrder.push('persist');
					expect(id).toBe('memory-001');
					expect(timestamp).toBe(1_730_000_000_000);
					expect((input as MemoryStoreInput).content).toBe('workflow test');
				}),
				scheduleVectorIndex: vi.fn(async ({ id, timestamp }) => {
					callOrder.push('index');
					expect(id).toBe('memory-001');
					expect(timestamp).toBe(1_730_000_000_000);
					return { vectorIndexed: true };
				}),
			},
		});

		const result = await engine.runStore({ content: 'workflow test' });

		expect(result).toEqual({ id: 'memory-001', vectorIndexed: true });
		expect(callOrder).toEqual(['id', 'timestamp', 'persist', 'index']);
	});

	it('treats vector indexing failures as non-fatal', async () => {
		const engine = new MemoryWorkflowEngine({
			store: {
				generateId: () => 'memory-err',
				getTimestamp: () => 1,
				persistMemory: vi.fn(async () => undefined),
				scheduleVectorIndex: vi.fn(async () => {
					throw new Error('vector service offline');
				}),
			},
		});

		const result = await engine.runStore({ content: 'fallback test' });
		expect(result).toEqual({ id: 'memory-err', vectorIndexed: false });
	});
});
