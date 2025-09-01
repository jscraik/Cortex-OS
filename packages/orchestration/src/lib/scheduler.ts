import { z } from 'zod';

// Task schema to ensure inputs are valid
const taskSchema = z.object({
  id: z.string(),
  run: z.function().returns(z.any()).args(),
  priority: z.number().int().default(0)
});

export type Task = z.infer<typeof taskSchema>;

/**
 * FIFO priority scheduler. Lower priority value runs first.
 * Tasks with same priority execute in enqueue order.
 */
export class PriorityScheduler {
  private queue: Array<Task & { order: number }> = [];
  private counter = 0;

  enqueue(task: Task): void {
    const t = taskSchema.parse(task);
    this.queue.push({ ...t, order: this.counter++ });
    // keep queue sorted by priority then order
    this.queue.sort((a, b) =>
      a.priority === b.priority ? a.order - b.order : a.priority - b.priority,
    );
  }

  async runNext(): Promise<any> {
    const next = this.queue.shift();
    if (!next) return undefined;
    return next.run();
  }

  async runAll(): Promise<any[]> {
    const results: any[] = [];
    while (this.queue.length) {
      results.push(await this.runNext());
    }
    return results;
  }
}
