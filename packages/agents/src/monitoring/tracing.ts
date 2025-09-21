// OpenTelemetry tracing temporarily disabled due to type issues
// TODO: Fix OpenTelemetry API type declarations

export interface TraceManagerConfig {
  readonly serviceName?: string;
  readonly version?: string;
  readonly sampleRate?: number;
  readonly exporter?: unknown;
}

export interface TraceSpan {
  end: () => void;
  setAttribute: (key: string, value: unknown) => void;
  addEvent: (name: string, attributes?: Record<string, unknown>) => void;
  recordException: (exception: Error) => void;
  setStatus: (status: { code: number; message?: string }) => void;
}

export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled?: boolean;
}

export class TraceManager {
  constructor(_config: TraceManagerConfig = {}) {
    // Mock implementation
  }

  startSpan(_name: string, _options?: any): TraceSpan {
    return {
      end: () => {},
      setAttribute: () => {},
      addEvent: () => {},
      recordException: () => {},
      setStatus: () => {},
    };
  }

  extractContext(_headers: Record<string, string>): TraceContext | null {
    return null;
  }

  injectContext(_ctx: TraceContext, _headers: Record<string, string>): void {
    // Mock implementation
  }

  async traceAsync<T>(name: string, fn: (span: TraceSpan) => Promise<T>): Promise<T> {
    const span = this.startSpan(name);
    try {
      return await fn(span);
    } finally {
      span.end();
    }
  }

  async traceLangGraphNode(node: any, input: unknown): Promise<unknown> {
    return await this.traceAsync(`langgraph.node.${node.type}`, async () => {
      return await node.execute(input);
    });
  }
}