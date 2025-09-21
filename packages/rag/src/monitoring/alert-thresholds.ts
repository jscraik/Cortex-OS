/**
 * Alert thresholds and monitoring configuration for RAG package health checks.
 *
 * This module defines the alert thresholds used by monitoring systems
 * to trigger alerts and notifications based on health check results.
 */

export interface AlertThresholds {
	/** Memory thresholds in MB */
	memory: {
		/** Warning threshold for RSS memory usage */
		warningMB: number;
		/** Critical threshold for RSS memory usage */
		criticalMB: number;
		/** Heap usage warning as percentage of total heap */
		heapWarningPercent: number;
		/** Heap usage critical as percentage of total heap */
		heapCriticalPercent: number;
	};

	/** Response time thresholds in milliseconds */
	latency: {
		/** Warning threshold for health endpoint response */
		warningMs: number;
		/** Critical threshold for health endpoint response */
		criticalMs: number;
	};

	/** Component health failure thresholds */
	components: {
		/** Maximum consecutive health check failures before alert */
		maxConsecutiveFailures: number;
		/** Time window for failure rate calculation in minutes */
		failureRateWindowMin: number;
		/** Error rate percentage threshold for warning */
		errorRateWarningPercent: number;
		/** Error rate percentage threshold for critical */
		errorRateCriticalPercent: number;
	};

	/** Resource utilization thresholds */
	resources: {
		/** CPU usage warning threshold (percentage) */
		cpuWarningPercent: number;
		/** CPU usage critical threshold (percentage) */
		cpuCriticalPercent: number;
		/** Disk usage warning threshold (percentage) */
		diskWarningPercent: number;
		/** Disk usage critical threshold (percentage) */
		diskCriticalPercent: number;
	};
}

/** Default production alert thresholds */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
	memory: {
		warningMB: 512, // 512 MB RSS warning
		criticalMB: 1024, // 1 GB RSS critical
		heapWarningPercent: 70, // 70% heap usage warning
		heapCriticalPercent: 85, // 85% heap usage critical
	},
	latency: {
		warningMs: 1000, // 1 second warning
		criticalMs: 5000, // 5 second critical
	},
	components: {
		maxConsecutiveFailures: 3, // 3 consecutive failures
		failureRateWindowMin: 10, // 10 minute window
		errorRateWarningPercent: 5, // 5% error rate warning
		errorRateCriticalPercent: 10, // 10% error rate critical
	},
	resources: {
		cpuWarningPercent: 70, // 70% CPU warning
		cpuCriticalPercent: 85, // 85% CPU critical
		diskWarningPercent: 80, // 80% disk warning
		diskCriticalPercent: 90, // 90% disk critical
	},
};

/** Development/testing alert thresholds (more lenient) */
export const DEV_ALERT_THRESHOLDS: AlertThresholds = {
	memory: {
		warningMB: 1024,
		criticalMB: 2048,
		heapWarningPercent: 80,
		heapCriticalPercent: 90,
	},
	latency: {
		warningMs: 2000,
		criticalMs: 10000,
	},
	components: {
		maxConsecutiveFailures: 5,
		failureRateWindowMin: 15,
		errorRateWarningPercent: 10,
		errorRateCriticalPercent: 20,
	},
	resources: {
		cpuWarningPercent: 80,
		cpuCriticalPercent: 90,
		diskWarningPercent: 85,
		diskCriticalPercent: 95,
	},
};

/**
 * Evaluates health summary against alert thresholds and returns alert status.
 */
export function evaluateHealthAlerts(
	health: import('../lib/health.js').HealthSummary,
	thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
): {
	level: 'ok' | 'warning' | 'critical';
	alerts: Array<{
		type: 'memory' | 'latency' | 'component' | 'resource';
		level: 'warning' | 'critical';
		message: string;
		metric: string;
		value: number;
		threshold: number;
	}>;
} {
	const alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'] = [];
	let maxLevel: 'ok' | 'warning' | 'critical' = 'ok';

	// Check memory-related alerts
	const memoryAlerts = checkMemoryAlerts(health, thresholds);
	alerts.push(...memoryAlerts.alerts);
	if (
		memoryAlerts.level === 'critical' ||
		(memoryAlerts.level === 'warning' && maxLevel === 'ok')
	) {
		maxLevel = memoryAlerts.level;
	}

	// Check component health alerts
	const componentAlerts = checkComponentAlerts(health);
	alerts.push(...componentAlerts.alerts);
	if (componentAlerts.level === 'critical') {
		maxLevel = 'critical';
	}

	return { level: maxLevel, alerts };
}

function checkMemoryAlerts(
	health: import('../lib/health.js').HealthSummary,
	thresholds: AlertThresholds,
): {
	level: 'ok' | 'warning' | 'critical';
	alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'];
} {
	const alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'] = [];
	let level: 'ok' | 'warning' | 'critical' = 'ok';

	// Check RSS memory
	const rssAlerts = checkRSSMemory(health, thresholds);
	alerts.push(...rssAlerts.alerts);
	if (rssAlerts.level !== 'ok') level = rssAlerts.level;

	// Check heap memory
	const heapAlerts = checkHeapMemory(health, thresholds);
	alerts.push(...heapAlerts.alerts);
	if (heapAlerts.level === 'critical' || (heapAlerts.level === 'warning' && level === 'ok')) {
		level = heapAlerts.level;
	}

	return { level, alerts };
}

function checkRSSMemory(
	health: import('../lib/health.js').HealthSummary,
	thresholds: AlertThresholds,
): {
	level: 'ok' | 'warning' | 'critical';
	alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'];
} {
	const alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'] = [];
	let level: 'ok' | 'warning' | 'critical' = 'ok';

	if (health.resources?.rssBytes) {
		const rssMB = health.resources.rssBytes / (1024 * 1024);
		if (rssMB >= thresholds.memory.criticalMB) {
			alerts.push({
				type: 'memory',
				level: 'critical',
				message: `RSS memory usage critically high: ${rssMB.toFixed(1)}MB`,
				metric: 'rss_mb',
				value: rssMB,
				threshold: thresholds.memory.criticalMB,
			});
			level = 'critical';
		} else if (rssMB >= thresholds.memory.warningMB) {
			alerts.push({
				type: 'memory',
				level: 'warning',
				message: `RSS memory usage high: ${rssMB.toFixed(1)}MB`,
				metric: 'rss_mb',
				value: rssMB,
				threshold: thresholds.memory.warningMB,
			});
			level = 'warning';
		}
	}

	return { level, alerts };
}

function checkHeapMemory(
	health: import('../lib/health.js').HealthSummary,
	thresholds: AlertThresholds,
): {
	level: 'ok' | 'warning' | 'critical';
	alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'];
} {
	const alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'] = [];
	let level: 'ok' | 'warning' | 'critical' = 'ok';

	if (health.resources?.heapUsedBytes && health.resources?.heapTotalBytes) {
		const heapPercent = (health.resources.heapUsedBytes / health.resources.heapTotalBytes) * 100;
		if (heapPercent >= thresholds.memory.heapCriticalPercent) {
			alerts.push({
				type: 'memory',
				level: 'critical',
				message: `Heap usage critically high: ${heapPercent.toFixed(1)}%`,
				metric: 'heap_percent',
				value: heapPercent,
				threshold: thresholds.memory.heapCriticalPercent,
			});
			level = 'critical';
		} else if (heapPercent >= thresholds.memory.heapWarningPercent) {
			alerts.push({
				type: 'memory',
				level: 'warning',
				message: `Heap usage high: ${heapPercent.toFixed(1)}%`,
				metric: 'heap_percent',
				value: heapPercent,
				threshold: thresholds.memory.heapWarningPercent,
			});
			level = 'warning';
		}
	}

	return { level, alerts };
}

function checkComponentAlerts(health: import('../lib/health.js').HealthSummary): {
	level: 'ok' | 'warning' | 'critical';
	alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'];
} {
	const alerts: ReturnType<typeof evaluateHealthAlerts>['alerts'] = [];
	let level: 'ok' | 'warning' | 'critical' = 'ok';

	const failedComponents = Object.entries(health.checks).filter(([, check]) => !check.ok);
	if (failedComponents.length > 0) {
		for (const [name, check] of failedComponents) {
			alerts.push({
				type: 'component',
				level: 'critical',
				message: `Component '${name}' unhealthy: ${check.error || 'unknown error'}`,
				metric: 'component_health',
				value: 0,
				threshold: 1,
			});
			level = 'critical';
		}
	}

	return { level, alerts };
}

/**
 * Formats alert thresholds for Prometheus AlertManager rules.
 */
export function generatePrometheusAlerts(
	thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
): string {
	return `
groups:
- name: rag_health_alerts
  rules:
  - alert: RAGHighMemoryUsage
    expr: rag_memory_rss_bytes / 1024 / 1024 > ${thresholds.memory.warningMB}
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "RAG service high memory usage"
      description: "RAG service memory usage is {{ $value }}MB, above warning threshold of ${thresholds.memory.warningMB}MB"

  - alert: RAGCriticalMemoryUsage
    expr: rag_memory_rss_bytes / 1024 / 1024 > ${thresholds.memory.criticalMB}
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "RAG service critical memory usage"
      description: "RAG service memory usage is {{ $value }}MB, above critical threshold of ${thresholds.memory.criticalMB}MB"

  - alert: RAGHighLatency
    expr: rag_health_check_duration_ms > ${thresholds.latency.warningMs}
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "RAG health check high latency"
      description: "RAG health check latency is {{ $value }}ms, above warning threshold of ${thresholds.latency.warningMs}ms"

  - alert: RAGComponentDown
    expr: rag_component_health == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "RAG component unhealthy"
      description: "RAG component {{ $labels.component }} is reporting unhealthy status"

  - alert: RAGHighErrorRate
    expr: rate(rag_errors_total[5m]) * 100 > ${thresholds.components.errorRateWarningPercent}
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "RAG high error rate"
      description: "RAG error rate is {{ $value }}%, above warning threshold of ${thresholds.components.errorRateWarningPercent}%"
`.trim();
}

/**
 * Formats alert thresholds for Grafana dashboard queries.
 */
export function generateGrafanaDashboard(
	thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS,
): Record<string, unknown> {
	return {
		dashboard: {
			title: 'RAG Health Monitoring',
			panels: [
				{
					title: 'Memory Usage',
					targets: [
						{
							expr: 'rag_memory_rss_bytes / 1024 / 1024',
							legendFormat: 'RSS Memory (MB)',
						},
					],
					thresholds: [
						{ value: thresholds.memory.warningMB, color: 'orange' },
						{ value: thresholds.memory.criticalMB, color: 'red' },
					],
				},
				{
					title: 'Health Check Latency',
					targets: [
						{
							expr: 'rag_health_check_duration_ms',
							legendFormat: 'Health Check Duration (ms)',
						},
					],
					thresholds: [
						{ value: thresholds.latency.warningMs, color: 'orange' },
						{ value: thresholds.latency.criticalMs, color: 'red' },
					],
				},
				{
					title: 'Component Health',
					targets: [
						{
							expr: 'rag_component_health',
							legendFormat: '{{ component }} Health',
						},
					],
					thresholds: [
						{ value: 0.5, color: 'red' },
						{ value: 1, color: 'green' },
					],
				},
				{
					title: 'Error Rate',
					targets: [
						{
							expr: 'rate(rag_errors_total[5m]) * 100',
							legendFormat: 'Error Rate (%)',
						},
					],
					thresholds: [
						{ value: thresholds.components.errorRateWarningPercent, color: 'orange' },
						{ value: thresholds.components.errorRateCriticalPercent, color: 'red' },
					],
				},
			],
		},
	};
}
