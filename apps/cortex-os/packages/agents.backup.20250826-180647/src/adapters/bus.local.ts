import type { EventBus, AgentEvent } from "../ports/EventBus.js";

export class LocalBus implements EventBus {
  private subs: ((e: AgentEvent) => void)[] = [];
  publish(e: AgentEvent) {
    this.subs.forEach((s) => s(e));
  }
  subscribe(f: (e: AgentEvent) => void) {
    this.subs.push(f);
    return () => (this.subs = this.subs.filter((x) => x !== f));
  }
}

