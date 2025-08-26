import type { Queue, QueueMessage } from "../ports/Queue.js";
import { uuid } from "@cortex-os/utils";

export type InMemoryQueue<T = unknown> = Queue<T>;

export const createInMemoryQueue = <T = unknown>(): InMemoryQueue<T> => {
  const state = {
    q: [] as QueueMessage<T>[],
    inflight: new Map<string, QueueMessage<T>>()
  };

  return {
    enqueue: async (body, delayMs = 0) => {
      state.q.push({ id: uuid(), body, visibleAt: Date.now() + delayMs, attempts: 0 });
    },
    
    reserve: async (nowMs) => {
      const i = state.q.findIndex((m) => m.visibleAt <= nowMs);
      if (i < 0) return null;
      const m = state.q.splice(i, 1)[0];
      m.attempts++;
      state.inflight.set(m.id, m);
      return m;
    },
    
    ack: async (id) => {
      state.inflight.delete(id);
    },
    
    nack: async (id, delayMs) => {
      const dead = state.inflight.get(id);
      if (!dead) return;
      state.q.push({ id: dead.id, body: dead.body, visibleAt: Date.now() + delayMs, attempts: dead.attempts });
      state.inflight.delete(id);
    }
  };
};