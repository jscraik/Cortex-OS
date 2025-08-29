import { describe, it, expect, beforeEach } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';
import { getSpans, getMetrics, resetTelemetry } from '../src/observability/otel.js';

describe('Telemetry Implementation', () => {
  beforeEach(() => {
    // Reset telemetry before each test
    resetTelemetry();
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
    const spans = getSpans();
    const spanNames = spans.map((span) => span.name);
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
    const metrics = getMetrics();
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

    try {
      await errorKernel.runPRPWorkflow(blueprint);
    } catch (error) {
      // Expected to throw
    }

    // Find error spans
    const spans = getSpans();
    const errorSpans = spans.filter((span) => span.status === 'ERROR');

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
