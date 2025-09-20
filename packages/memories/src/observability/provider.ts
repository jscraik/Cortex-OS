import type { Attributes, Span, Tracer } from '@opentelemetry/api';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type {
  MemoryMetrics,
  MemorySpanAttributes,
  ObservabilityConfig,
  ObservabilityProvider,
} from './types.js';

/**
 * Default observability configuration
 */
const DEFAULT_CONFIG: Required<ObservabilityConfig> = {
  tracing: true,
  metrics: true,
  logging: true,
  sampleRate: 1.0,
  serviceName: 'memories-service',
  tags: {},
};

/**
 * OpenTelemetry-based observability provider
 */
export class OpenTelemetryObservabilityProvider implements ObservabilityProvider {
  private readonly config: Required<ObservabilityConfig>;
  private readonly tracer: Tracer;
  private readonly metricsEnabled: boolean;
  private readonly tracingEnabled: boolean;

  constructor(config: ObservabilityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tracer = trace.getTracer(this.config.serviceName, '0.1.0');
    this.metricsEnabled = this.config.metrics;
    this.tracingEnabled = this.config.tracing && this.config.sampleRate > 0;
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Create a span with attributes
   */
  async createSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: MemorySpanAttributes,
  ): Promise<T> {
    if (!this.tracingEnabled) {
      return fn(NoopSpan.INSTANCE);
    }

    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      return fn(NoopSpan.INSTANCE);
    }

    const span = this.tracer.startSpan(name, {
      attributes: this.formatAttributes(attributes),
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const err = error as Error;
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Record metrics
   */
  recordMetrics(metrics: MemoryMetrics): void {
    if (!this.metricsEnabled) {
      return;
    }

    // Log metrics for now - in a real implementation, this would use
    // OpenTelemetry metrics API or a metrics provider
    if (this.config.logging) {
      console.log('[Memory Metrics]', {
        ...metrics,
        timestamp: new Date().toISOString(),
        service: this.config.serviceName,
      });
    }

    // NOTE: Metrics recording via OTEL metrics API can be wired when available.
    // This would typically use:
    // - Counter for operation counts
    // - Histogram for duration distributions
    // - Gauge for memory sizes
  }

  /**
   * Check if observability is enabled
   */
  isEnabled(): boolean {
    return this.tracingEnabled || this.metricsEnabled;
  }

  /**
   * Format span attributes for OpenTelemetry
   */
  private formatAttributes(attributes?: MemorySpanAttributes): Attributes {
    if (!attributes) {
      return {};
    }

    const formatted: Attributes = {};

    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        formatted[key] = value;
      }
    }

    // Add service tags
    if (this.config.tags) {
      Object.assign(formatted, this.config.tags);
    }

    return formatted;
  }
}

/**
 * No-op span implementation for when tracing is disabled
 */
class NoopSpan implements Span {
  static readonly INSTANCE = new NoopSpan();

  private constructor() { }

  spanContext() {
    return {
      traceId: '',
      spanId: '',
      traceFlags: 0,
    };
  }

  setAttribute(_key: string, _value: unknown): this {
    return this;
  }

  setAttributes(_attributes: Attributes): this {
    return this;
  }

  addEvent(_name: string, _attributes?: Attributes): this {
    return this;
  }

  setStatus(_status: { code: SpanStatusCode; message?: string }): this {
    return this;
  }

  updateName(_name: string): this {
    return this;
  }

  end(): void { }

  isRecording(): boolean {
    return false;
  }

  recordException(_exception: unknown, _time?: unknown): void { }

  // Added in newer OpenTelemetry API versions
  addLink(_spanContext: unknown, _attributes?: unknown): this {
    return this;
  }

  addLinks(_links: unknown[]): this {
    return this;
  }
}

/**
 * Create an observability provider from configuration
 */
export function createObservabilityProvider(config?: ObservabilityConfig): ObservabilityProvider {
  return new OpenTelemetryObservabilityProvider(config);
}

/**
 * Create default observability configuration
 */
export function createDefaultObservabilityConfig(): ObservabilityConfig {
  return {
    tracing: process.env.OTEL_TRACING_ENABLED === 'true',
    metrics: process.env.OTEL_METRICS_ENABLED === 'true',
    logging: process.env.OTEL_LOGGING_ENABLED !== 'false',
    sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
    serviceName: process.env.OTEL_SERVICE_NAME || 'memories-service',
    tags: process.env.OTEL_RESOURCE_ATTRIBUTES
      ? Object.fromEntries(
        process.env.OTEL_RESOURCE_ATTRIBUTES.split(',').map((attr) => {
          const [key, value] = attr.split('=');
          return [key, value];
        }),
      )
      : {},
  };
}
