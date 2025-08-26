import type { Queue } from "../ports/Queue.js";
import type { Clock } from "../ports/Clock.js";

export class Scheduler {
  constructor(private q: Queue<any>, private clock: Clock) {}
  async every(ms: number, runId: string) {
    await this.q.enqueue({ runId }, ms);
  }
}

