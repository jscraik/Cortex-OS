export type AgentEvent = { type: string; payload: unknown };

export interface EventBus {
  publish(e: AgentEvent): void;
  subscribe(f: (e: AgentEvent) => void): () => void;
}

