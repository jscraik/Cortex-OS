export interface Envelope {
  id: string;
  type: string;
  occurredAt: string;
  ttlMs: number;
  headers: Record<string, unknown>;
  payload: Record<string, unknown>;
  source?: string;
}

export interface Handler {
  type: string;
  handle: (env: Envelope) => Promise<void> | void;
}

export function createEnvelope({ type, data, source }: { type: string; data: Record<string, unknown>; source?: string }) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    type,
    occurredAt: new Date().toISOString(),
    ttlMs: 60000,
    headers: {},
    payload: data,
    source,
  };
}

function createBus() {
  const handlers: Record<string, Handler[]> = {};
  return {
    bind(hs: Handler[]) {
      for (const h of hs) {
        handlers[h.type] = handlers[h.type] || [];
        handlers[h.type].push(h);
      }
    },
    async publish(env: Envelope) {
      for (const h of handlers[env.type] || []) {
        await h.handle(env);
      }
    },
  };
}

export const healthHandler: Handler = {
  type: 'event.health.v1',
  handle: async () => {},
};

export interface A2AWiring {
  bus: ReturnType<typeof createBus>;
  publish: (type: string, data: Record<string, unknown>, source?: string) => void;
  publishMcp?: (event: { type: string; payload: Record<string, unknown> }) => void;
}

export function wireA2A(): A2AWiring {
  const bus = createBus();
  bus.bind([healthHandler]);

  let publishMcp: A2AWiring['publishMcp'];
  if (process.env.CORTEX_MCP_A2A_TELEMETRY === '1') {
    publishMcp = (evt) => {
      void bus.publish(createEnvelope({ type: evt.type, data: evt.payload, source: 'urn:cortex-os:mcp' }));
    };
  }

  const publish = (type: string, data: Record<string, unknown>, source = 'urn:cortex-os:runtime') => {
    void bus.publish(createEnvelope({ type, data, source }));
  };

  return { bus, publish, publishMcp };
}
