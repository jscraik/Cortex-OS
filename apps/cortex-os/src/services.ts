// Unified merged implementation: in-memory services replacing previous dynamic proxy stubs.
// If future persistence/backends are introduced, adapt these factories behind the same API surface.

type Memory = {
  id: string;
  kind: "note" | "event" | "artifact" | "embedding";
  text?: string;
  createdAt: string;
  updatedAt: string;
  provenance: { source: string };
};

export type MemoryService = {
  save: (m: Memory) => Promise<Memory>;
  get: (id: string) => Promise<Memory | null>;
};

export function provideMemories(): MemoryService {
  const store = new Map<string, Memory>();
  return {
    async save(m) {
      store.set(m.id, m);
      return m;
    },
    async get(id) {
      return store.get(id) ?? null;
    },
  };
}

export function provideOrchestration() {
  // Placeholder orchestration surface – extend with real orchestrator wiring.
  return { config: {} };
}

export function provideMCP() {
  // Minimal MCP facade; extend with tool registry + lifecycle as needed.
  return {
    async callTool() {
      return {};
    },
    async close() {},
  };
}

export const tracer = {
  startSpan(_name: string) {
    return {
      setStatus(_status: unknown) {},
      recordException(_err: unknown) {},
      end() {},
    };
  },
};

export function configureAuditPublisherWithBus(_publish: (evt: unknown) => void) {
  // TODO: wire audit events to bus (currently no-op stub)
}
