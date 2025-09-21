import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import { MetricsCollector } from '../../src/monitoring/metrics';
import { metricsRoutes } from '../../src/server/routes/metrics.routes';

// Mock the requirePermission middleware to bypass auth for unit testing
vi.mock('../../src/auth/permissions', () => ({
  requirePermission: vi.fn(() => async (c: any, next: any) => {
    await next();
  }),
}));

describe('Metrics Endpoint', () => {
  let app: Hono;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    metricsCollector = new MetricsCollector();

    // Mock the MetricsCollector to be used in routes
    vi.spyOn(metricsCollector, 'getPrometheusMetrics').mockResolvedValue(`
# HELP cortex_requests_total Total number of requests
# TYPE cortex_requests_total counter
cortex_requests_total{agent="test-agent",status="success"} 5
cortex_requests_total{agent="test-agent",status="error"} 1

# HELP cortex_request_duration_seconds Request duration in seconds
# TYPE cortex_request_duration_seconds histogram
cortex_request_duration_seconds_bucket{le="0.1"} 0
cortex_request_duration_seconds_bucket{le="0.5"} 3
cortex_request_duration_seconds_bucket{le="1.0"} 5
cortex_request_duration_seconds_bucket{le="+Inf"} 6
cortex_request_duration_seconds_sum 3.5
cortex_request_duration_seconds_count 6

# HELP cortex_active_agents Current number of active agents
# TYPE cortex_active_agents gauge
cortex_active_agents 3

# HELP cortex_memory_usage_percent Memory usage percentage
# TYPE cortex_memory_usage_percent gauge
cortex_memory_usage_percent 45.2
    `);

    // Setup routes
    app.use('*', async (c, next) => {
      c.set('metricsCollector', metricsCollector);
      await next();
    });
    app.route('/metrics', metricsRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics with proper format', async () => {
      const response = await app.request('/metrics', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; version=0.0.4');

      const text = await response.text();
      expect(text).toContain('# HELP cortex_requests_total Total number of requests');
      expect(text).toContain('# TYPE cortex_requests_total counter');
      expect(text).toContain('cortex_requests_total{agent="test-agent",status="success"} 5');
      expect(text).toContain('cortex_request_duration_seconds_bucket');
      expect(text).toContain('cortex_active_agents 3');
      expect(text).toContain('cortex_memory_usage_percent 45.2');
    });

    it('should handle metrics collection errors gracefully', async () => {
      vi.spyOn(metricsCollector, 'getPrometheusMetrics').mockRejectedValueOnce(
        new Error('Metrics collection failed')
      );

      const response = await app.request('/metrics', {
        method: 'GET',
      });

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(await response.text()).toContain('Failed to collect metrics');
    });

    it('should include proper response headers for Prometheus', async () => {
      const response = await app.request('/metrics', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; version=0.0.4');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('X-Metrics-Format')).toBe('prometheus');
    });

    it('should log metrics access for audit', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await app.request('/metrics', {
        method: 'GET',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Metrics accessed',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('GET /metrics/health', () => {
    it('should return health metrics summary', async () => {
      const response = await app.request('/metrics/health', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toHaveProperty('requests');
      expect(data.metrics).toHaveProperty('agents');
      expect(data.metrics).toHaveProperty('resources');
    });
  });

  describe('GET /metrics/agents/:agentId', () => {
    it('should return agent-specific metrics', async () => {
      // Mock an agent metric
      vi.spyOn(metricsCollector, 'getAgentMetrics').mockReturnValueOnce({
        agentId: 'test-agent',
        requests: 10,
        errors: 2,
        errorRate: 0.2,
        avgLatency: 150,
        activeSessions: 3,
        lastUpdated: new Date().toISOString(),
      });

      const response = await app.request('/metrics/agents/test-agent', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('agentId', 'test-agent');
      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toHaveProperty('requests', 10);
    });

    it('should return 404 for non-existent agent', async () => {
      vi.spyOn(metricsCollector, 'getAgentMetrics').mockReturnValueOnce(null);

      const response = await app.request('/metrics/agents/non-existent', {
        method: 'GET',
      });

      expect(response.status).toBe(404);
    });
  });
});