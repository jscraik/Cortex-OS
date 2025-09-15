import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../../src/lib/event-bus.js';
import type { Envelope } from '../../../src/lib/types.js';

describe('Event Bus', () => {
	it('publishes and receives events via subscribe', async () => {
		const bus = createEventBus({
			enableLogging: false,
			bufferSize: 2,
			flushInterval: 50,
		});

		const handler = vi.fn();
		const sub = bus.subscribe('agent.started', (event: Envelope) =>
			handler(event),
		);

		const evt = {
			type: 'agent.started',
			data: {
				agentId: 'a-1',
				traceId: 't-1',
				capability: 'documentation',
				input: { ok: true },
				timestamp: new Date().toISOString(),
			},
		};

		// Directly publish a fully shaped envelope (legacy validator removed)
		const envelope = {
			specversion: '1.0' as const,
			id: 'evt-1',
			type: evt.type,
			source: 'test',
			time: new Date().toISOString(),
			ttlMs: 60_000,
			headers: {},
			data: evt.data,
		};
		await bus.publish(envelope);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].type).toBe('agent.started');

		sub.unsubscribe();
		await bus.publish(envelope);
		expect(handler).toHaveBeenCalledTimes(1); // no change after unsubscribe
	});

	it('supports workflow.* events with validation', async () => {
		const bus = createEventBus({ enableLogging: false });
		const seen: string[] = [];
		bus.subscribe('workflow.started', (e: Envelope) => seen.push(e.type));
		bus.subscribe('workflow.completed', (e: Envelope) => seen.push(e.type));

		const started = {
			type: 'workflow.started',
			data: {
				workflowId: 'w-1',
				name: 'wf',
				tasksCount: 1,
				timestamp: new Date().toISOString(),
			},
		};
		const completed = {
			type: 'workflow.completed',
			data: {
				workflowId: 'w-1',
				status: 'completed',
				metrics: {
					totalTime: 10,
					tasksCompleted: 1,
					tasksTotal: 1,
					agentsUsed: ['documentation'],
				},
				timestamp: new Date().toISOString(),
			},
		};

		const startedEnvelope = {
			specversion: '1.0' as const,
			id: 'wf-started',
			type: started.type,
			source: 'test',
			time: new Date().toISOString(),
			ttlMs: 60_000,
			headers: {},
			data: started.data,
		};
		const completedEnvelope = {
			specversion: '1.0' as const,
			id: 'wf-completed',
			type: completed.type,
			source: 'test',
			time: new Date().toISOString(),
			ttlMs: 60_000,
			headers: {},
			data: completed.data,
		};
		await bus.publish(startedEnvelope);
		await bus.publish(completedEnvelope);

		expect(seen).toEqual(['workflow.started', 'workflow.completed']);
	});
});
