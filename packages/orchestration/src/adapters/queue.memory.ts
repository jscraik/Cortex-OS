import type { Queue, QueueMessage } from "../ports/Queue.js";

export class InMemoryQueue<T = unknown> implements Queue<T> {
  private q: QueueMessage<T>[] = [];
  private inflight = new Map<string, QueueMessage<T>>();
  
  async enqueue(body: T, delayMs = 0) {
    this.q.push({ id: crypto.randomUUID(), body, visibleAt: Date.now() + delayMs, attempts: 0 });
  }
  
  async reserve(nowMs: number) {
    const i = this.q.findIndex((m) => m.visibleAt <= nowMs);
    if (i < 0) return null;
    const m = this.q.splice(i, 1)[0];
    m.attempts++;
    this.inflight.set(m.id, m);
    return m;
  }
  
  async ack(id: string) {
    this.inflight.delete(id);
  }
  
  async nack(id: string, delayMs: number) {
    const dead = this.inflight.get(id);
    if (!dead) return;
    this.q.push({ id, body: dead.body, visibleAt: Date.now() + delayMs, attempts: dead.attempts });
    this.inflight.delete(id);
  }
}

