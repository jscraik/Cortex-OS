import { describe, expect, it } from 'vitest';

import {
        OrchestrationEventTypes,
        createOrchestrationBus,
        type OrchestrationEventEnvelope,
} from '../src/events/orchestration-bus.js';

describe('Orchestration A2A bus', () => {
        it('publishes orchestration lifecycle events', async () => {
                const bus = createOrchestrationBus({ source: 'urn:test:orchestration' });
                const received: OrchestrationEventEnvelope[] = [];

                const unsubscribe = await bus.bind([
                        {
                                type: OrchestrationEventTypes.TaskCreated,
                                handle: async (event) => {
                                        received.push(event);
                                },
                        },
                ]);

                await bus.publish(OrchestrationEventTypes.TaskCreated, {
                        taskId: 'task-1',
                        input: { goal: 'ship feature' },
                });

                expect(received).toHaveLength(1);
                expect(received[0].type).toBe(OrchestrationEventTypes.TaskCreated);
                expect(received[0].data.taskId).toBe('task-1');

                await unsubscribe();
        });

        it('validates payloads before publishing', async () => {
                const bus = createOrchestrationBus();

                await expect(
                        bus.publish(OrchestrationEventTypes.TaskFailed, {
                                taskId: 'task-1',
                                // Missing error message should trigger validation failure
                        } as any),
                ).rejects.toThrow();
        });
});
