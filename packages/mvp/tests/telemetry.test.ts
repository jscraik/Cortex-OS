import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';

// Mock OTEL spans and metrics for testing
let otelSpans: any[] = [];
let metrics: any[] = [];

// Mock OTEL functions
const mockOtel = {
  startSpan: (name: string) => ({
    name,
    status: 'OK',
    attributes: {},
    end: function () {
      otelSpans.push(this);
    },
    setStatus: function (status: string) {
      this.status = status;
      return this;
    },
    setAttribute: function (key: string, value: any) {
      this.attributes[key] = value;
      return this;
    },
  }),
  recordMetric: (name: string, value: number, unit: string = '') => {
    metrics.push({ name, value, unit });
  },
};

// Mock the OTEL implementation in the graph-simple module
vi.mock('../src/observability/otel.js', () => ({
  startSpan: mockOtel.startSpan,
  recordMetric: mockOtel.recordMetric,
}));

describe('Telemetry Implementation', () => {
  beforeEach(() => {
    // Reset mocks before each test
    otelSpans = [];
    metrics = [];
  });

  it('should create OTEL spans for each workflow phase', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Telemetry Test',
      description: 'Test OTEL spans',
      requirements: ['Trace execution'],
    };

    const result = await kernel.runPRPWorkflow(blueprint);

    // Should have created spans for each phase
    const spanNames = otelSpans.map((span) => span.name);
    expect(spanNames).toContain('prp.strategy');
    expect(spanNames).toContain('prp.build');
    expect(spanNames).toContain('prp.evaluation');
  });

  it('should track execution metrics', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Metrics Test',
      description: 'Test metrics tracking',
      requirements: ['Track performance'],
    };

    const result = await kernel.runPRPWorkflow(blueprint);

    // Should track key metrics
    const metricNames = metrics.map((metric) => metric.name);
    expect(metricNames).toContain('prp.duration');
    expect(metricNames).toContain('prp.phases.completed');
  });

  it('should include error information in spans', async () => {
    // Create a mock orchestrator that throws an error
    const errorOrchestrator = {
      getNeuronCount: () => {
        throw new Error('Simulated error');
      },
    };

    const errorKernel = new CortexKernel(errorOrchestrator);

    const blueprint = {
      title: 'Error Test',
      description: 'Test error telemetry',
      requirements: ['Track errors'],
    };

    const result = await errorKernel.runPRPWorkflow(blueprint);

    // Find error spans
    const errorSpans = otelSpans.filter((span) => span.status === 'ERROR');

    // Should include error information in spans
    expect(errorSpans.length).toBeGreaterThan(0);

    // Check if any error span has the expected error message
    const hasExpectedError = errorSpans.some(
      (span) =>
        span.attributes &&
        span.attributes['error.message'] &&
        span.attributes['error.message'].includes('Simulated error'),
    );

    expect(hasExpectedError).toBe(true);
  });
});
