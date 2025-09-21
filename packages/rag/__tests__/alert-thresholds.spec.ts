import { describe, expect, it } from 'vitest';
import type { HealthSummary } from '../src/lib/health.js';
import {
	DEFAULT_ALERT_THRESHOLDS,
	DEV_ALERT_THRESHOLDS,
	evaluateHealthAlerts,
	generateGrafanaDashboard,
	generatePrometheusAlerts,
} from '../src/monitoring/alert-thresholds.js';

describe('Alert Thresholds', () => {
	const healthySummary: HealthSummary = {
		ok: true,
		checks: {
			embedder: { ok: true },
			store: { ok: true },
			reranker: { ok: true },
		},
		timestamp: '2025-09-20T19:30:00.000Z',
		resources: {
			rssBytes: 200 * 1024 * 1024, // 200MB
			heapUsedBytes: 100 * 1024 * 1024, // 100MB
			heapTotalBytes: 200 * 1024 * 1024, // 200MB
			uptimeSeconds: 3600,
		},
	};

	describe('evaluateHealthAlerts', () => {
		it('returns ok for healthy system', () => {
			const result = evaluateHealthAlerts(healthySummary);
			expect(result.level).toBe('ok');
			expect(result.alerts).toHaveLength(0);
		});

		it('warns on high memory usage', () => {
			const highMemSummary: HealthSummary = {
				...healthySummary,
				resources: {
					...healthySummary.resources,
					rssBytes: 600 * 1024 * 1024, // 600MB > 512MB warning
				},
			};

			const result = evaluateHealthAlerts(highMemSummary);
			expect(result.level).toBe('warning');
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].type).toBe('memory');
			expect(result.alerts[0].level).toBe('warning');
			expect(result.alerts[0].message).toContain('RSS memory usage high');
		});

		it('triggers critical on very high memory usage', () => {
			const criticalMemSummary: HealthSummary = {
				...healthySummary,
				resources: {
					...healthySummary.resources,
					rssBytes: 1200 * 1024 * 1024, // 1200MB > 1024MB critical
				},
			};

			const result = evaluateHealthAlerts(criticalMemSummary);
			expect(result.level).toBe('critical');
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].level).toBe('critical');
			expect(result.alerts[0].message).toContain('RSS memory usage critically high');
		});

		it('warns on high heap usage percentage', () => {
			const highHeapSummary: HealthSummary = {
				...healthySummary,
				resources: {
					...healthySummary.resources,
					heapUsedBytes: 150 * 1024 * 1024, // 75% of 200MB > 70% warning
				},
			};

			const result = evaluateHealthAlerts(highHeapSummary);
			expect(result.level).toBe('warning');
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].message).toContain('Heap usage high: 75.0%');
		});

		it('triggers critical for failed components', () => {
			const failedComponentSummary: HealthSummary = {
				...healthySummary,
				ok: false,
				checks: {
					embedder: { ok: false, error: 'Model failed to load' },
					store: { ok: true },
					reranker: { ok: true },
				},
			};

			const result = evaluateHealthAlerts(failedComponentSummary);
			expect(result.level).toBe('critical');
			expect(result.alerts).toHaveLength(1);
			expect(result.alerts[0].type).toBe('component');
			expect(result.alerts[0].level).toBe('critical');
			expect(result.alerts[0].message).toContain("Component 'embedder' unhealthy");
		});

		it('uses dev thresholds when provided', () => {
			const highMemSummary: HealthSummary = {
				...healthySummary,
				resources: {
					...(healthySummary.resources || {}),
					rssBytes: 600 * 1024 * 1024, // 600MB
				},
			};

			// Should warn with default thresholds (512MB)
			const defaultResult = evaluateHealthAlerts(highMemSummary, DEFAULT_ALERT_THRESHOLDS);
			expect(defaultResult.level).toBe('warning');

			// Should be ok with dev thresholds (1024MB)
			const devResult = evaluateHealthAlerts(highMemSummary, DEV_ALERT_THRESHOLDS);
			expect(devResult.level).toBe('ok');
		});

		it('handles multiple alerts and returns highest level', () => {
			const multipleProblemsSummary: HealthSummary = {
				ok: false,
				checks: {
					embedder: { ok: false, error: 'Failed' },
					store: { ok: true },
					reranker: { ok: true },
				},
				timestamp: '2025-09-20T19:30:00.000Z',
				resources: {
					rssBytes: 600 * 1024 * 1024, // Warning level
					heapUsedBytes: 150 * 1024 * 1024,
					heapTotalBytes: 200 * 1024 * 1024,
					uptimeSeconds: 3600,
				},
			};

			const result = evaluateHealthAlerts(multipleProblemsSummary);
			expect(result.level).toBe('critical'); // Critical from failed component
			expect(result.alerts.length).toBeGreaterThanOrEqual(2); // Memory warning + component critical
		});
	});

	describe('generatePrometheusAlerts', () => {
		it('generates valid Prometheus alert rules', () => {
			const rules = generatePrometheusAlerts();
			expect(rules).toContain('groups:');
			expect(rules).toContain('- name: rag_health_alerts');
			expect(rules).toContain('alert: RAGHighMemoryUsage');
			expect(rules).toContain('alert: RAGCriticalMemoryUsage');
			expect(rules).toContain('alert: RAGComponentDown');
			expect(rules).toContain(`> ${DEFAULT_ALERT_THRESHOLDS.memory.warningMB}`);
			expect(rules).toContain(`> ${DEFAULT_ALERT_THRESHOLDS.memory.criticalMB}`);
		});

		it('uses custom thresholds when provided', () => {
			const customThresholds = {
				...DEFAULT_ALERT_THRESHOLDS,
				memory: { ...DEFAULT_ALERT_THRESHOLDS.memory, warningMB: 2048 },
			};

			const rules = generatePrometheusAlerts(customThresholds);
			expect(rules).toContain('> 2048');
		});
	});

	describe('generateGrafanaDashboard', () => {
		it('generates valid Grafana dashboard config', () => {
			const dashboard = generateGrafanaDashboard();
			expect(dashboard).toHaveProperty('dashboard');
			expect(dashboard.dashboard).toHaveProperty('title', 'RAG Health Monitoring');
			expect(dashboard.dashboard).toHaveProperty('panels');

			const panels = (dashboard.dashboard as Record<string, unknown>).panels as Array<
				Record<string, unknown>
			>;
			expect(panels).toHaveLength(4);

			const memoryPanel = panels.find((p) => p.title === 'Memory Usage');
			expect(memoryPanel).toBeDefined();
			expect(memoryPanel?.thresholds).toHaveLength(2);
			const thresholds = memoryPanel?.thresholds as Array<{ value: number }>;
			expect(thresholds[0].value).toBe(DEFAULT_ALERT_THRESHOLDS.memory.warningMB);
			expect(thresholds[1].value).toBe(DEFAULT_ALERT_THRESHOLDS.memory.criticalMB);
		});

		it('includes all expected panels', () => {
			const dashboard = generateGrafanaDashboard();
			const panels = (dashboard.dashboard as Record<string, unknown>).panels as Array<
				Record<string, unknown>
			>;

			const titles = panels.map((p) => p.title as string);
			expect(titles).toContain('Memory Usage');
			expect(titles).toContain('Health Check Latency');
			expect(titles).toContain('Component Health');
			expect(titles).toContain('Error Rate');
		});
	});

	describe('threshold constants', () => {
		it('has reasonable default thresholds', () => {
			expect(DEFAULT_ALERT_THRESHOLDS.memory.warningMB).toBe(512);
			expect(DEFAULT_ALERT_THRESHOLDS.memory.criticalMB).toBe(1024);
			expect(DEFAULT_ALERT_THRESHOLDS.latency.warningMs).toBe(1000);
			expect(DEFAULT_ALERT_THRESHOLDS.latency.criticalMs).toBe(5000);
			expect(DEFAULT_ALERT_THRESHOLDS.components.maxConsecutiveFailures).toBe(3);
		});

		it('has more lenient dev thresholds', () => {
			expect(DEV_ALERT_THRESHOLDS.memory.warningMB).toBeGreaterThan(
				DEFAULT_ALERT_THRESHOLDS.memory.warningMB,
			);
			expect(DEV_ALERT_THRESHOLDS.memory.criticalMB).toBeGreaterThan(
				DEFAULT_ALERT_THRESHOLDS.memory.criticalMB,
			);
			expect(DEV_ALERT_THRESHOLDS.latency.warningMs).toBeGreaterThan(
				DEFAULT_ALERT_THRESHOLDS.latency.warningMs,
			);
		});
	});
});
