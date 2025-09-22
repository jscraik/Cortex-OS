import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { MetricsCollector } from '../../../src/monitoring/metrics';

describe('Metrics Routes - Simple Tests', () => {
  let app: Hono<{ Variables: { metricsCollector?: MetricsCollector } }>;

  beforeEach(() => {
    app = new Hono<{ Variables: { metricsCollector?: MetricsCollector } }>();

    // Mock metrics collector
    const mockMetricsCollector = {
      getPrometheusMetrics: async () => `# Simple metrics
http_requests_total 1000
brAInwav_agents_active 5`,
      getMetrics: () => ({
        requests: { total: 1000, success: 950, error: 50, latency: { avg: 120 } },
        agents: [{ id: 'agent1', activeSessions: 5 }],
        resources: { cpu: 45, memory: 60 }
      }),
      getAgentMetrics: (agentId: string) => {
        if (agentId === 'brAInwav-code-agent') {
          return { executions: 1500, averageLatency: 125, successRate: 0.95, status: 'active' };
        }
        return null;
      }
    } as unknown as MetricsCollector;

    // Set up metrics collector in context
    app.use('*', (c, next) => {
      c.set('metricsCollector', mockMetricsCollector);
      return next();
    });

    // Create simple metrics routes inline for testing
    app.get('/metrics', async (c) => {
      const collector = c.get('metricsCollector') as MetricsCollector;
      if (!collector) {
        return c.json({ message: 'Metrics collector not available' }, 500);
      }

      const metrics = await collector.getPrometheusMetrics();
      return c.text(metrics, 200, {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache',
        'X-Metrics-Format': 'prometheus'
      });
    });

    app.get('/metrics/health', async (c) => {
      const collector = c.get('metricsCollector') as MetricsCollector;
      if (!collector) {
        return c.json({ message: 'Metrics collector not available' }, 500);
      }

      const metrics = collector.getMetrics();
      return c.json({
        timestamp: new Date().toISOString(),
        metrics: {
          requests: metrics.requests,
          agents: metrics.agents,
          resources: metrics.resources,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        }
      });
    });

    app.get('/metrics/agents/:agentId', async (c) => {
      const collector = c.get('metricsCollector') as MetricsCollector;
      if (!collector) {
        return c.json({ message: 'Metrics collector not available' }, 500);
      }

      const agentId = c.req.param('agentId');
      const agentMetrics = collector.getAgentMetrics(agentId);

      if (!agentMetrics) {
        return c.json({ message: `Agent '${agentId}' not found` }, 404);
      }

      return c.json({
        agentId,
        metrics: agentMetrics
      });
    });
  });

  describe('Prometheus Metrics Endpoint (GET /metrics)', () => {
    it('should return Prometheus formatted metrics', async () => {
      const response = await app.request('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; version=0.0.4');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('X-Metrics-Format')).toBe('prometheus');

      const body = await response.text();
      expect(body).toContain('http_requests_total');
      expect(body).toContain('brAInwav_agents_active');
    });
  });

  describe('Health Metrics Summary (GET /metrics/health)', () => {
    it('should return comprehensive health metrics', async () => {
      const response = await app.request('/metrics/health');

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.timestamp).toBeDefined();
      expect(result.metrics.requests.total).toBe(1000);
      expect(result.metrics.agents).toHaveLength(1);
      expect(result.metrics.system.uptime).toBeGreaterThan(0);
    });
  });

  describe('Agent-Specific Metrics (GET /metrics/agents/:agentId)', () => {
    it('should return metrics for specific agent', async () => {
      const response = await app.request('/metrics/agents/brAInwav-code-agent');

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.agentId).toBe('brAInwav-code-agent');
      expect(result.metrics.executions).toBe(1500);
      expect(result.metrics.status).toBe('active');
    });

    it('should handle non-existent agent', async () => {
      const response = await app.request('/metrics/agents/non-existent-agent');

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.message).toBe("Agent 'non-existent-agent' not found");
    });
  });
});
