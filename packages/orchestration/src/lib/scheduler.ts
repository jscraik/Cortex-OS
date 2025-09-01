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

  // Insert task into queue using binary search for correct position
  enqueue(task: Task): void {
    const t = taskSchema.parse(task);
    const newTask = { ...t, order: this.counter++ };
    // Find insertion index using binary search
    let left = 0, right = this.queue.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = this.queue[mid].priority === newTask.priority
        ? this.queue[mid].order - newTask.order
        : this.queue[mid].priority - newTask.priority;
      if (cmp <= 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    this.queue.splice(left, 0, newTask);
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
