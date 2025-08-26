export type Event<T = unknown> = { type: string; payload: T };

export class EventBus {
  private subscribers: Record<string, Array<(e: Event) => void>> = {};
  publish<T>(evt: Event<T>) {
    for (const fn of this.subscribers[evt.type] ?? []) fn(evt);
  }
  subscribe(type: string, fn: (e: Event) => void) {
    this.subscribers[type] = this.subscribers[type] ?? [];
    this.subscribers[type].push(fn);
  }
}
