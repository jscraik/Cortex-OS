import type { CloudEvent } from './cloudevents.js';
import type { InMemoryOutbox } from './outbox.js';

export type EventHandler<T = unknown> = (event: CloudEvent<T>) => Promise<void> | void;

/**
 * Minimal A2A router dispatching CloudEvents by type.
 */
export class A2ARouter {
  private handlers = new Map<string, EventHandler<any>>();

  on<T>(type: string, handler: EventHandler<T>): void {
    this.handlers.set(type, handler as EventHandler<any>);
  }

  async route(event: CloudEvent, outbox?: InMemoryOutbox): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (!handler) {
      throw new Error(`no handler for ${event.type}`);
    }
    try {
      await handler(event);
    } catch (err) {
      outbox?.moveToDLQ(event);
      throw err;
    }
  }
}
