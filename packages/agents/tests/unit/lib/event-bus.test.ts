import { describe, expect, it, vi } from 'vitest';
import { createEventBus, validateAgentEvent } from '@/lib/event-bus.js';

describe('Event Bus', () => {
  it('publishes and receives events via subscribe', async () => {
    const bus = createEventBus({ enableLogging: false, bufferSize: 2, flushInterval: 50 });

    const handler = vi.fn();
    const sub = bus.subscribe('agent.started', (event: any) => handler(event));

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

    // Validate event fits schema
    const validated = validateAgentEvent(evt);
    await bus.publish(validated as any);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('agent.started');

    sub.unsubscribe();
    await bus.publish(validated as any);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports workflow.* events with validation', async () => {
    const bus = createEventBus({ enableLogging: false });
    const seen: string[] = [];
    bus.subscribe('workflow.started', (e: any) => seen.push(e.type));
    bus.subscribe('workflow.completed', (e: any) => seen.push(e.type));

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
        metrics: { totalTime: 10, tasksCompleted: 1, tasksTotal: 1, agentsUsed: ['documentation'] },
        timestamp: new Date().toISOString(),
      },
    };

    await bus.publish(validateAgentEvent(started) as any);
    await bus.publish(validateAgentEvent(completed) as any);

    expect(seen).toEqual(['workflow.started', 'workflow.completed']);
  });
});
