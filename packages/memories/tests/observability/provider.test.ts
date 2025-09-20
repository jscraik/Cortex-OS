import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenTelemetryObservabilityProvider, createDefaultObservabilityConfig } from '../../src/observability/provider.js';

describe('OpenTelemetry Observability Provider', () => {
  let provider: OpenTelemetryObservabilityProvider;

  beforeEach(() => {
    // Mock OpenTelemetry API
    vi.mock('@opentelemetry/api', () => ({
      trace: {
        getTracer: vi.fn().mockReturnValue({
          startSpan: vi.fn().mockReturnValue({
            setAttribute: vi.fn().mockReturnThis(),
            setAttributes: vi.fn().mockReturnThis(),
            setStatus: vi.fn().mockReturnThis(),
            recordException: vi.fn().mockReturnThis(),
            end: vi.fn(),
            spanContext: () => ({
              traceId: '123',
              spanId: '456',
              traceFlags: 1,
            }),
          }),
        }),
        setSpan: vi.fn().mockReturnValue({}),
      },
      context: {
        with: vi.fn().mockImplementation((_, fn) => fn()),
        active: () => ({}),
      },
      SpanStatusCode: {
        OK: 1,
        ERROR: 2,
      },
    }));

    // Clear environment variables
    delete process.env.OTEL_TRACING_ENABLED;
    delete process.env.OTEL_METRICS_ENABLED;
    delete process.env.OTEL_SAMPLE_RATE;
    delete process.env.OTEL_SERVICE_NAME;
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      // When
      provider = new OpenTelemetryObservabilityProvider();

      // Then
      expect(provider.isEnabled()).toBe(true);
    });

    it('should use provided configuration', () => {
      // When
      provider = new OpenTelemetryObservabilityProvider({
        tracing: false,
        metrics: false,
        sampleRate: 0.5,
        serviceName: 'test-service',
      });

      // Then
      expect(provider.isEnabled()).toBe(false);
    });

    it('should disable tracing when sample rate is 0', () => {
      // When
      provider = new OpenTelemetryObservabilityProvider({
        tracing: true,
        metrics: false,
        sampleRate: 0,
      });

      // Then
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe('Span Creation', () => {
    beforeEach(() => {
      provider = new OpenTelemetryObservabilityProvider();
    });

    it('should create span and execute function', async () => {
      // Given
      const mockFn = vi.fn().mockResolvedValue('result');

      // When
      const result = await provider.createSpan('test-span', mockFn, {
        'test.attribute': 'value',
      });

      // Then
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle errors and mark span as failed', async () => {
      // Given
      const error = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(error);

      // When/Then
      await expect(provider.createSpan('test-span', mockFn)).rejects.toThrow('Test error');
    });

    it('should skip span creation when tracing disabled', async () => {
      // Given
      provider = new OpenTelemetryObservabilityProvider({ tracing: false });
      const mockFn = vi.fn().mockResolvedValue('result');

      // When
      const result = await provider.createSpan('test-span', mockFn);

      // Then
      expect(result).toBe('result');
    });

    it('should apply sampling', async () => {
      // Given
      provider = new OpenTelemetryObservabilityProvider({
        tracing: true,
        sampleRate: 0.001, // Very low sample rate
      });
      const mockFn = vi.fn().mockResolvedValue('result');

      // When
      const result = await provider.createSpan('test-span', mockFn);

      // Then - function should still execute even if span is not created
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('Metrics Recording', () => {
    beforeEach(() => {
      provider = new OpenTelemetryObservabilityProvider();
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should record metrics when enabled', () => {
      // Given
      const metrics = {
        operation: 'test',
        duration: 100,
        success: true,
        namespace: 'default',
      };

      // When
      provider.recordMetrics(metrics);

      // Then
      expect(console.log).toHaveBeenCalledWith('[Memory Metrics]', expect.objectContaining({
        ...metrics,
        service: 'memories-service',
      }));
    });

    it('should not record metrics when disabled', () => {
      // Given
      provider = new OpenTelemetryObservabilityProvider({ metrics: false });
      const metrics = {
        operation: 'test',
        duration: 100,
        success: true,
        namespace: 'default',
      };

      // When
      provider.recordMetrics(metrics);

      // Then
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Environment Configuration', () => {
    it('should create config from environment variables', () => {
      // Given
      process.env.OTEL_TRACING_ENABLED = 'false';
      process.env.OTEL_METRICS_ENABLED = 'true';
      process.env.OTEL_SAMPLE_RATE = '0.5';
      process.env.OTEL_SERVICE_NAME = 'env-service';
      process.env.OTEL_RESOURCE_ATTRIBUTES = 'env=value,env2=value2';

      // When
      const config = createDefaultObservabilityConfig();

      // Then
      expect(config).toEqual({
        tracing: false,
        metrics: true,
        logging: true,
        sampleRate: 0.5,
        serviceName: 'env-service',
        tags: {
          env: 'value',
          env2: 'value2',
        },
      });

      // Cleanup
      delete process.env.OTEL_TRACING_ENABLED;
      delete process.env.OTEL_METRICS_ENABLED;
      delete process.env.OTEL_SAMPLE_RATE;
      delete process.env.OTEL_SERVICE_NAME;
      delete process.env.OTEL_RESOURCE_ATTRIBUTES;
    });

    it('should handle missing environment variables', () => {
      // When
      const config = createDefaultObservabilityConfig();

      // Then
      expect(config.tracing).toBe(false);
      expect(config.metrics).toBe(false);
      expect(config.sampleRate).toBe(1.0);
      expect(config.serviceName).toBe('memories-service');
      expect(config.tags).toEqual({});
    });
  });
});