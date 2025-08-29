import { describe, it, expect, vi } from 'vitest';
import { validateTaskInput } from '@/lib/validate-task-input.js';
import { resolveIdempotency } from '@/lib/resolve-idempotency.js';
import { createTask as buildTask } from '@/lib/create-task.js';
import { emitPlanStarted } from '@/lib/emit-plan-started.js';
import { ValidationError, type TaskInput, type Task } from '@/types/index.js';

describe('task helper utilities', () => {
  const baseInput: TaskInput = {
    title: 'T',
    brief: 'B',
    inputs: [],
    scopes: ['a'],
    schema: 'cortex.task.input@1',
  };

  it('validates task input', () => {
    expect(validateTaskInput(baseInput)).toEqual(baseInput);
    expect(() => validateTaskInput({ ...baseInput, scopes: [] })).toThrow(ValidationError);
  });

  it('handles idempotency resolution', () => {
    const tasks = new Map<string, Task>();
    const cache = new Map<string, string>();
    const { key, existingTask } = resolveIdempotency(baseInput, undefined, cache, tasks);
    expect(existingTask).toBeUndefined();
    expect(key).toBeTypeOf('string');

    const task = buildTask();
    tasks.set(task.id, task);
    cache.set(key, task.id);

    const second = resolveIdempotency(baseInput, key, cache, tasks);
    expect(second.existingTask).toEqual(task);
  });

  it('creates task entities', () => {
    const task = buildTask();
    expect(task.status).toBe('queued');
    expect(task.schema).toBe('cortex.task@1');
  });

  it('emits PlanStarted events', async () => {
    const task = buildTask();
    const emit = vi.fn();
    await emitPlanStarted(emit, task, baseInput);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PlanStarted', taskId: task.id }),
    );
  });
});
