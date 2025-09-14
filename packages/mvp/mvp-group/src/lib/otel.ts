/**
 * @file lib/otel.ts
 * @description Lightweight telemetry helpers (span + metric) for mvp-group
 * Mirrors the simple mock used in mvp package to avoid missing import errors.
 */

interface Span {
  name: string;
  status: string;
  attributes: Record<string, unknown>;
  end(): void;
  setStatus(status: string): Span;
  setAttribute(key: string, value: unknown): Span;
}

const spans: Span[] = [];
const metrics: Array<{ name: string; value: number; unit?: string }> = [];

export const startSpan = (name: string): Span => {
  const span: Span = {
    name,
    status: 'OK',
    attributes: {},
    end() {
      spans.push(this);
    },
    setStatus(status: string) {
      this.status = status;
      return this;
    },
    setAttribute(key: string, value: unknown) {
      this.attributes[key] = value;
      return this;
    },
  };
  return span;
};

export const recordMetric = (name: string, value: number, unit = ''): void => {
  metrics.push({ name, value, unit });
};

// Test helpers (unused in prod)
export const _getSpans = () => spans;
export const _getMetrics = () => metrics;
export const _resetTelemetry = () => {
  spans.length = 0;
  metrics.length = 0;
};
