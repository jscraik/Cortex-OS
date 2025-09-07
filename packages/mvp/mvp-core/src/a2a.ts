import type { CloudEvent } from './cloudevents.js';
import type { InMemoryOutbox } from './outbox.js';

export type EventHandler<T = unknown> = (event: CloudEvent<T>) => Promise<void> | void;

/**
 * Minimal A2A router dispatching CloudEvents by type.
 */
export class A2ARouter {
  private handlers = new Map<string, EventHandler<any>[]>();

  on<T>(type: string, handler: EventHandler<T>): void {
    const arr = this.handlers.get(type) ?? [];
    arr.push(handler as EventHandler<any>);
    this.handlers.set(type, arr);
  }

  async route(event: CloudEvent, outbox?: InMemoryOutbox): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.length === 0) {
      throw new Error(`no handler for ${event.type}`);
    }
    try {
      for (const handler of handlers) {
        await handler(event);
      }
    } catch (err) {
      outbox?.moveToDLQ(event);
      throw err;
    }
  }
}
