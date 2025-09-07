import type { CloudEvent } from './cloudevents.js';
import type { InMemoryOutbox } from './outbox.js';

export type EventHandler<T = unknown> = (event: CloudEvent<T>) => Promise<void> | void;

/**
 * Minimal A2A router dispatching CloudEvents by type.
 */
export class A2ARouter<EventMap extends Record<string, unknown>> {
  private handlers = new Map<keyof EventMap, EventHandler<any>>();

  on<K extends keyof EventMap>(type: K, handler: EventHandler<EventMap[K]>): void {
    this.handlers.set(type, handler);
  }

  async route<K extends keyof EventMap>(event: CloudEvent<EventMap[K]> & { type: K }, outbox?: InMemoryOutbox): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (!handler) {
      throw new Error(`no handler for ${String(event.type)}`);
    }
    try {
      await handler(event);
    } catch (err) {
      outbox?.moveToDLQ(event);
      throw err;
    }
  }
}
