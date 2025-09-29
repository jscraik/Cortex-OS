import { describe, expect, it } from 'vitest';
import { register } from 'prom-client';
import {
        MetricsCollector,
        agentMetrics,
        errorMetrics,
        healthMetrics,
        performanceMetrics,
        requestMetrics,
        securityMetrics,
} from '../../packages/orchestration/src/monitoring/prometheus-metrics.js';
import { assertNoPlaceholders } from './utils/assert-no-placeholders.js';

describe('Cross-cutting acceptance: observability metrics', () => {
        it('produces live Prometheus gauges and counters', async () => {
                register.clear();

                const metricsCollector = new MetricsCollector();
                const metricGroups = [
                        requestMetrics,
                        agentMetrics,
                        performanceMetrics,
                        errorMetrics,
                        securityMetrics,
                        healthMetrics,
                ];

                for (const group of metricGroups) {
                        for (const metric of Object.values(group)) {
                                register.registerMetric(metric);
                        }
                }

                metricsCollector.recordRequest('high', 0.92, 2.4, 'success');
                requestMetrics.activeRequests.set(3);
                requestMetrics.queueDepth.labels('high').set(1);

                metricsCollector.updateAgentMetrics(6, 4, 'analysis');
                metricsCollector.recordPerformance(54.2, 61.8, 14.5);
                metricsCollector.recordError('timeout', 'agent-runner', 'medium');
                metricsCollector.recordSecurityEvent('violation', {
                        violation_type: 'policy_breach',
                        severity: 'high',
                });

                healthMetrics.healthStatus.set(1);
                healthMetrics.componentHealth.labels('api-gateway').set(1);
                healthMetrics.lastHealthCheck.set(Date.now());

                const snapshot = await metricsCollector.getMetrics();

                expect(snapshot).toContain('no_requests_total');
                expect(snapshot).toContain('no_agents_available');
                expect(snapshot).toContain('no_security_violations_total');
                expect(snapshot).toContain('no_health_status');

                expect(snapshot).toMatch(/no_requests_total\{[^}]*status="success"[^}]*\} 1/);
                expect(snapshot).toMatch(/no_agents_active\{[^}]*analysis[^}]*\} 4/);
                expect(snapshot).toMatch(/no_security_violations_total\{[^}]*violation_type="policy_breach"[^}]*\} 1/);
                expect(snapshot).toMatch(/no_health_status 1/);

                assertNoPlaceholders(snapshot, 'Prometheus metrics snapshot');
        });
});
