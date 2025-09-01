import { describe, it, expect } from 'vitest';
import { PriorityScheduler } from '../src/lib/scheduler.js';

describe('PriorityScheduler', () => {
  it('runs tasks by priority then FIFO', async () => {
    const order: string[] = [];
    const scheduler = new PriorityScheduler();
    scheduler.enqueue({ id: 'a', priority: 1, run: async () => order.push('a') });
    scheduler.enqueue({ id: 'b', priority: 0, run: async () => order.push('b') });
    scheduler.enqueue({ id: 'c', priority: 1, run: async () => order.push('c') });
    await scheduler.runAll();
    expect(order).toEqual(['b', 'a', 'c']);
  });
});
