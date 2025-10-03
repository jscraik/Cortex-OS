// SLO Validation Service for brAInwav Cortex WebUI
// Service Level Objective validation, compliance monitoring, and reporting

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	type LoadTestResult,
	PerformanceTestSuite,
	type StressTestResult,
} from '../__tests__/performance/performanceTestSuite.js';
import {
	advancedMetricsService,
	type MetricsSnapshot,
	type SLOStatus,
} from '../monitoring/services/advancedMetricsService.js';

export interface SLOTargets {
	p95LatencyMs: number;
	p99LatencyMs: number;
	errorRatePercent: number;
	throughputRps: number;
	availabilityPercent: number;
	cacheHitRatePercent: number;
	memoryUsagePercent: number;
}

export interface SLOReport {
	id: string;
	timestamp: Date;
	reportPeriod: {
		start: Date;
		end: Date;
		duration: number; // seconds
	};
	overallCompliance: {
		status: 'compliant' | 'warning' | 'non-compliant';
		score: number; // 0-100
		passedSLOs: number;
		totalSLOs: number;
	};
	sloResults: Array<{
		name: string;
		target: number;
		actual: number;
		status: 'pass' | 'warning' | 'fail';
		deviation: number;
		trend: 'improving' | 'stable' | 'degrading';
	}>;
	performanceTestResults?: {
		loadTest?: LoadTestResult;
		stressTest?: StressTestResult;
	};
	metricsSummary: {
		totalRequests: number;
		averageLatency: number;
		errorRate: number;
		throughput: number;
	};
	recommendations: string[];
	alerts: Array<{
		severity: 'info' | 'warning' | 'critical';
		message: string;
		metric: string;
	}>;
}

export interface SLOHistory {
	reports: SLOReport[];
	complianceTrend: Array<{
		date: Date;
		score: number;
		status: 'compliant' | 'warning' | 'non-compliant';
	}>;
	performanceTrends: {
		latency: Array<{ date: Date; value: number }>;
		errorRate: Array<{ date: Date; value: number }>;
		throughput: Array<{ date: Date; value: number }>;
	};
}

export class SLOValidationService {
	private static instance: SLOValidationService;
	private testSuite: PerformanceTestSuite;
	private targets: SLOTargets;
	private history: SLOHistory = {
		reports: [],
		complianceTrend: [],
		performanceTrends: {
			latency: [],
			errorRate: [],
			throughput: [],
		},
	};
	private maxHistorySize = 100;
	private outputDir: string;

	private constructor() {
		this.testSuite = new PerformanceTestSuite();
		this.targets = {
			p95LatencyMs: 500,
			p99LatencyMs: 1000,
			errorRatePercent: 0.5,
			throughputRps: 50,
			availabilityPercent: 99.9,
			cacheHitRatePercent: 80,
			memoryUsagePercent: 80,
		};
		this.outputDir = join(process.cwd(), 'reports', 'slo');
		this.ensureOutputDirectory();
		this.initializeSLOs();
	}

	public static getInstance(): SLOValidationService {
		if (!SLOValidationService.instance) {
			SLOValidationService.instance = new SLOValidationService();
		}
		return SLOValidationService.instance;
	}

	private ensureOutputDirectory(): void {
		try {
			mkdirSync(this.outputDir, { recursive: true });
		} catch (error) {
			console.error('Failed to create output directory:', error);
		}
	}

	private initializeSLOs(): void {
		// Register SLOs with the metrics service
		advancedMetricsService.registerSLO({
			name: 'api-p95-latency',
			target: { p95Latency: this.targets.p95LatencyMs },
			window: 300, // 5 minutes
			alertThreshold: 20, // Alert when 20% above target
		});

		advancedMetricsService.registerSLO({
			name: 'api-error-rate',
			target: { errorRate: this.targets.errorRatePercent },
			window: 300,
			alertThreshold: 50,
		});

		advancedMetricsService.registerSLO({
			name: 'api-throughput',
			target: { throughput: this.targets.throughputRps },
			window: 300,
			alertThreshold: 25,
		});

		advancedMetricsService.registerSLO({
			name: 'cache-hit-rate',
			target: { throughput: this.targets.cacheHitRatePercent },
			window: 300,
			alertThreshold: 30,
		});

		advancedMetricsService.registerSLO({
			name: 'memory-usage',
			target: { errorRate: this.targets.memoryUsagePercent },
			window: 300,
			alertThreshold: 40,
		});
	}

	public async validateSLOs(
		options: {
			runPerformanceTests?: boolean;
			period?: {
				start?: Date;
				end?: Date;
				duration?: number; // seconds
			};
		} = {},
	): Promise<SLOReport> {
		console.log('Starting SLO validation...');

		const reportId = `slo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
		const now = new Date();

		const period = {
			start:
				options.period?.start ||
				new Date(now.getTime() - (options.period?.duration || 3600) * 1000),
			end: options.period?.end || now,
			duration: options.period?.duration || 3600,
		};

		console.log(
			`Validating SLOs for period: ${period.start.toISOString()} to ${period.end.toISOString()}`,
		);

		// Get current SLO statuses from metrics service
		const sloStatuses = advancedMetricsService.getSLOStatuses();
		const metricsHistory = advancedMetricsService.getMetricsHistory(
			Math.floor(period.duration / 60),
		);

		// Calculate SLO results
		const sloResults = await this.calculateSLOResults(sloStatuses, metricsHistory);

		// Run performance tests if requested
		let performanceTestResults:
			| { loadTest: LoadTestResult; stressTest: StressTestResult }
			| undefined;
		if (options.runPerformanceTests) {
			console.log('Running performance tests...');
			await this.testSuite.startServer();

			try {
				const loadTestResult = await this.testSuite.runLoadTest({
					concurrentUsers: 50,
					rampUpTime: 30,
					testDuration: 120, // 2 minutes
					endpoints: [
						{ path: '/api/models', method: 'GET', weight: 3 },
						{ path: '/api/conversations', method: 'GET', weight: 2 },
					],
				});

				const stressTestResult = await this.testSuite.runStressTest({
					maxUsers: 500,
					stepSize: 25,
					stepDuration: 60,
					maxDuration: 600, // 10 minutes
					endpoint: { path: '/api/models', method: 'GET' },
					failureThreshold: 10,
					degradationThreshold: 5,
				});

				performanceTestResults = {
					loadTest: loadTestResult,
					stressTest: stressTestResult,
				};

				console.log('Performance tests completed');
			} finally {
				await this.testSuite.stopServer();
			}
		}

		// Calculate overall compliance
		const overallCompliance = this.calculateOverallCompliance(sloResults);

		// Generate recommendations
		const recommendations = this.generateRecommendations(sloResults, performanceTestResults);

		// Generate alerts
		const alerts = this.generateAlerts(sloResults);

		// Get metrics summary
		const metricsSummary = await this.getMetricsSummary(period);

		// Create report
		const report: SLOReport = {
			id: reportId,
			timestamp: now,
			reportPeriod: period,
			overallCompliance,
			sloResults,
			performanceTestResults,
			metricsSummary,
			recommendations,
			alerts,
		};

		// Save report
		this.saveReport(report);

		// Update history
		this.updateHistory(report);

		console.log(
			`SLO validation completed: ${overallCompliance.status} (${overallCompliance.score.toFixed(1)}/100)`,
		);

		return report;
	}

	private async calculateSLOResults(
		sloStatuses: Map<string, SLOStatus>,
		metricsHistory: MetricsSnapshot[],
	): Promise<SLOReport['sloResults']> {
		const results: SLOReport['sloResults'] = [];

		// P95 Latency SLO
		const p95LatencyStatus = sloStatuses.get('api-p95-latency');
		if (p95LatencyStatus) {
			const latestMetrics = metricsHistory[metricsHistory.length - 1];
			const actualLatency = latestMetrics?.http.p95Latency || 0;
			const targetLatency = this.targets.p95LatencyMs;
			const deviation =
				targetLatency > 0 ? ((actualLatency - targetLatency) / targetLatency) * 100 : 0;

			results.push({
				name: 'P95 Latency',
				target: targetLatency,
				actual: actualLatency,
				status: actualLatency <= targetLatency ? 'pass' : deviation > 20 ? 'fail' : 'warning',
				deviation,
				trend: this.calculateTrend('latency', metricsHistory),
			});
		}

		// Error Rate SLO
		const errorRateStatus = sloStatuses.get('api-error-rate');
		if (errorRateStatus) {
			const latestMetrics = metricsHistory[metricsHistory.length - 1];
			const actualErrorRate = latestMetrics?.http.errorRate || 0;
			const targetErrorRate = this.targets.errorRatePercent;
			const deviation =
				targetErrorRate > 0 ? ((actualErrorRate - targetErrorRate) / targetErrorRate) * 100 : 0;

			results.push({
				name: 'Error Rate',
				target: targetErrorRate,
				actual: actualErrorRate,
				status: actualErrorRate <= targetErrorRate ? 'pass' : deviation > 50 ? 'fail' : 'warning',
				deviation,
				trend: this.calculateTrend('errorRate', metricsHistory),
			});
		}

		// Throughput SLO
		const throughputStatus = sloStatuses.get('api-throughput');
		if (throughputStatus) {
			const latestMetrics = metricsHistory[metricsHistory.length - 1];
			const actualThroughput = latestMetrics?.http.requestRate || 0;
			const targetThroughput = this.targets.throughputRps;
			const deviation =
				targetThroughput > 0 ? ((targetThroughput - actualThroughput) / targetThroughput) * 100 : 0;

			results.push({
				name: 'Throughput',
				target: targetThroughput,
				actual: actualThroughput,
				status: actualThroughput >= targetThroughput ? 'pass' : deviation > 25 ? 'fail' : 'warning',
				deviation,
				trend: this.calculateTrend('throughput', metricsHistory),
			});
		}

		// Cache Hit Rate SLO
		const cacheStatus = sloStatuses.get('cache-hit-rate');
		if (cacheStatus) {
			const latestMetrics = metricsHistory[metricsHistory.length - 1];
			const actualHitRate = latestMetrics?.cache.hitRate || 0;
			const targetHitRate = this.targets.cacheHitRatePercent;
			const deviation =
				targetHitRate > 0 ? ((targetHitRate - actualHitRate) / targetHitRate) * 100 : 0;

			results.push({
				name: 'Cache Hit Rate',
				target: targetHitRate,
				actual: actualHitRate,
				status: actualHitRate >= targetHitRate ? 'pass' : deviation > 30 ? 'fail' : 'warning',
				deviation,
				trend: this.calculateTrend('cacheHitRate', metricsHistory),
			});
		}

		// Memory Usage SLO
		const latestMetrics = metricsHistory[metricsHistory.length - 1];
		if (latestMetrics) {
			const memoryUsageRatio =
				(latestMetrics.memory.heapUsed / latestMetrics.memory.heapTotal) * 100;
			const targetMemoryUsage = this.targets.memoryUsagePercent;
			const deviation = ((memoryUsageRatio - targetMemoryUsage) / targetMemoryUsage) * 100;

			results.push({
				name: 'Memory Usage',
				target: targetMemoryUsage,
				actual: memoryUsageRatio,
				status:
					memoryUsageRatio <= targetMemoryUsage ? 'pass' : deviation > 40 ? 'fail' : 'warning',
				deviation,
				trend: this.calculateTrend('memoryUsage', metricsHistory),
			});
		}

		return results;
	}

	private calculateTrend(
		metric: string,
		metricsHistory: MetricsSnapshot[],
	): 'improving' | 'stable' | 'degrading' {
		if (metricsHistory.length < 10) {
			return 'stable';
		}

		const recent = metricsHistory.slice(-5);
		const older = metricsHistory.slice(-10, -5);

		let recentAvg = 0;
		let olderAvg = 0;

		switch (metric) {
			case 'latency':
				recentAvg = recent.reduce((sum, m) => sum + m.http.p95Latency, 0) / recent.length;
				olderAvg = older.reduce((sum, m) => sum + m.http.p95Latency, 0) / older.length;
				break;
			case 'errorRate':
				recentAvg = recent.reduce((sum, m) => sum + m.http.errorRate, 0) / recent.length;
				olderAvg = older.reduce((sum, m) => sum + m.http.errorRate, 0) / older.length;
				break;
			case 'throughput':
				recentAvg = recent.reduce((sum, m) => sum + m.http.requestRate, 0) / recent.length;
				olderAvg = older.reduce((sum, m) => sum + m.http.requestRate, 0) / older.length;
				break;
			case 'cacheHitRate':
				recentAvg = recent.reduce((sum, m) => sum + m.cache.hitRate, 0) / recent.length;
				olderAvg = older.reduce((sum, m) => sum + m.cache.hitRate, 0) / older.length;
				break;
			case 'memoryUsage':
				recentAvg =
					recent.reduce((sum, m) => sum + (m.memory.heapUsed / m.memory.heapTotal) * 100, 0) /
					recent.length;
				olderAvg =
					older.reduce((sum, m) => sum + (m.memory.heapUsed / m.memory.heapTotal) * 100, 0) /
					older.length;
				break;
		}

		const change = (recentAvg - olderAvg) / olderAvg;

		if (metric === 'latency' || metric === 'errorRate' || metric === 'memoryUsage') {
			// For these metrics, lower is better
			return change < -0.05 ? 'improving' : change > 0.05 ? 'degrading' : 'stable';
		} else {
			// For these metrics, higher is better
			return change > 0.05 ? 'improving' : change < -0.05 ? 'degrading' : 'stable';
		}
	}

	private calculateOverallCompliance(
		sloResults: SLOReport['sloResults'],
	): SLOReport['overallCompliance'] {
		const passedSLOs = sloResults.filter((slo) => slo.status === 'pass').length;
		const _warningSLOs = sloResults.filter((slo) => slo.status === 'warning').length;
		const totalSLOs = sloResults.length;

		// Calculate score (pass = 100%, warning = 50%, fail = 0%)
		const score =
			sloResults.reduce((sum, slo) => {
				switch (slo.status) {
					case 'pass':
						return sum + 100;
					case 'warning':
						return sum + 50;
					case 'fail':
						return sum + 0;
					default:
						return sum;
				}
			}, 0) / totalSLOs;

		let status: 'compliant' | 'warning' | 'non-compliant';
		if (score >= 90) {
			status = 'compliant';
		} else if (score >= 70) {
			status = 'warning';
		} else {
			status = 'non-compliant';
		}

		return {
			status,
			score,
			passedSLOs,
			totalSLOs,
		};
	}

	private generateRecommendations(
		sloResults: SLOReport['sloResults'],
		performanceTestResults?: {
			loadTest?: LoadTestResult;
			stressTest?: StressTestResult;
		},
	): string[] {
		const recommendations: string[] = [];

		for (const slo of sloResults) {
			if (slo.status === 'fail' || slo.status === 'warning') {
				switch (slo.name) {
					case 'P95 Latency':
						if (slo.actual > 1000) {
							recommendations.push(
								'Critical: P95 latency is extremely high. Investigate performance bottlenecks immediately.',
							);
						} else {
							recommendations.push(
								'Optimize slow endpoints and consider implementing additional caching strategies.',
							);
						}
						break;
					case 'Error Rate':
						if (slo.actual > 5) {
							recommendations.push(
								'Critical: Error rate is too high. Review error logs and fix failing endpoints.',
							);
						} else {
							recommendations.push(
								'Investigate error patterns and implement better error handling.',
							);
						}
						break;
					case 'Throughput':
						recommendations.push(
							'Increase system capacity or optimize resource utilization for better throughput.',
						);
						break;
					case 'Cache Hit Rate':
						recommendations.push(
							'Review caching strategies and increase cache TTL for frequently accessed data.',
						);
						break;
					case 'Memory Usage':
						if (slo.actual > 90) {
							recommendations.push(
								'Critical: Memory usage is too high. Optimize memory usage and consider increasing resources.',
							);
						} else {
							recommendations.push(
								'Monitor memory allocation patterns and optimize garbage collection.',
							);
						}
						break;
				}
			}
		}

		// Performance test recommendations
		if (performanceTestResults?.loadTest) {
			const loadTest = performanceTestResults.loadTest;
			if (!loadTest.sloCompliance.overall) {
				recommendations.push(
					'Load test indicates SLO violations under normal load. Review performance optimizations.',
				);
			}
		}

		if (performanceTestResults?.stressTest) {
			const stressTest = performanceTestResults.stressTest;
			if (stressTest.overallResult === 'failed') {
				recommendations.push('System fails under stress. Improve resilience and scalability.');
			} else if (stressTest.overallResult === 'degraded') {
				recommendations.push(
					'System shows degradation under stress. Consider load balancing strategies.',
				);
			}
		}

		return recommendations;
	}

	private generateAlerts(sloResults: SLOReport['sloResults']): SLOReport['alerts'] {
		const alerts: SLOReport['alerts'] = [];

		for (const slo of sloResults) {
			if (slo.status === 'fail') {
				let severity: 'info' | 'warning' | 'critical' = 'warning';

				switch (slo.name) {
					case 'P95 Latency':
						severity = slo.actual > 1000 ? 'critical' : 'warning';
						break;
					case 'Error Rate':
						severity = slo.actual > 5 ? 'critical' : 'warning';
						break;
					case 'Memory Usage':
						severity = slo.actual > 90 ? 'critical' : 'warning';
						break;
				}

				alerts.push({
					severity,
					message: `${slo.name} SLO violation: ${slo.actual.toFixed(2)} (target: ${slo.target})`,
					metric: slo.name.toLowerCase().replace(' ', '-'),
				});
			}
		}

		return alerts;
	}

	private async getMetricsSummary(period: {
		start: Date;
		end: Date;
	}): Promise<SLOReport['metricsSummary']> {
		const metricsHistory = advancedMetricsService.getMetricsHistory();
		const recentMetrics = metricsHistory.filter(
			(m) => m.timestamp >= period.start && m.timestamp <= period.end,
		);

		if (recentMetrics.length === 0) {
			return {
				totalRequests: 0,
				averageLatency: 0,
				errorRate: 0,
				throughput: 0,
			};
		}

		const totalRequests = recentMetrics.reduce((sum, m) => sum + m.http.totalRequests, 0);
		const averageLatency =
			recentMetrics.reduce((sum, m) => sum + m.http.averageLatency, 0) / recentMetrics.length;
		const errorRate =
			recentMetrics.reduce((sum, m) => sum + m.http.errorRate, 0) / recentMetrics.length;
		const throughput =
			recentMetrics.reduce((sum, m) => sum + m.http.requestRate, 0) / recentMetrics.length;

		return {
			totalRequests,
			averageLatency,
			errorRate,
			throughput,
		};
	}

	private saveReport(report: SLOReport): void {
		try {
			const filename = `slo-report-${report.id}.json`;
			const filepath = join(this.outputDir, filename);
			writeFileSync(filepath, JSON.stringify(report, null, 2));
			console.log(`SLO report saved to: ${filepath}`);

			// Also save as markdown for readability
			const markdownFile = filepath.replace('.json', '.md');
			const markdown = this.generateMarkdownReport(report);
			writeFileSync(markdownFile, markdown);
		} catch (error) {
			console.error('Failed to save SLO report:', error);
		}
	}

	private generateMarkdownReport(report: SLOReport): string {
		const lines: string[] = [];

		lines.push('# brAInwav Cortex WebUI SLO Report');
		lines.push(`Report ID: ${report.id}`);
		lines.push(`Generated: ${report.timestamp.toISOString()}`);
		lines.push(
			`Period: ${report.reportPeriod.start.toISOString()} to ${report.reportPeriod.end.toISOString()}`,
		);
		lines.push('');

		// Overall Compliance
		lines.push('## Overall Compliance');
		lines.push(`**Status:** ${report.overallCompliance.status.toUpperCase()}`);
		lines.push(`**Score:** ${report.overallCompliance.score.toFixed(1)}/100`);
		lines.push(
			`**SLOs Passed:** ${report.overallCompliance.passedSLOs}/${report.overallCompliance.totalSLOs}`,
		);
		lines.push('');

		// SLO Results
		lines.push('## SLO Results');
		lines.push('| SLO | Target | Actual | Status | Deviation | Trend |');
		lines.push('|-----|--------|--------|--------|-----------|-------|');

		for (const slo of report.sloResults) {
			const statusIcon = slo.status === 'pass' ? '✅' : slo.status === 'warning' ? '⚠️' : '❌';
			const trendIcon = slo.trend === 'improving' ? '📈' : slo.trend === 'degrading' ? '📉' : '➡️';
			lines.push(
				`| ${slo.name} | ${slo.target} | ${slo.actual.toFixed(2)} | ${statusIcon} ${slo.status} | ${slo.deviation.toFixed(1)}% | ${trendIcon} ${slo.trend} |`,
			);
		}
		lines.push('');

		// Metrics Summary
		lines.push('## Metrics Summary');
		lines.push(`- **Total Requests:** ${report.metricsSummary.totalRequests.toLocaleString()}`);
		lines.push(`- **Average Latency:** ${report.metricsSummary.averageLatency.toFixed(2)}ms`);
		lines.push(`- **Error Rate:** ${report.metricsSummary.errorRate.toFixed(2)}%`);
		lines.push(`- **Throughput:** ${report.metricsSummary.throughput.toFixed(2)} RPS`);
		lines.push('');

		// Performance Tests
		if (report.performanceTestResults) {
			lines.push('## Performance Test Results');
			if (report.performanceTestResults.loadTest) {
				const lt = report.performanceTestResults.loadTest;
				lines.push('### Load Test');
				lines.push(`- **Total Requests:** ${lt.totalRequests.toLocaleString()}`);
				lines.push(
					`- **Success Rate:** ${((lt.successfulRequests / lt.totalRequests) * 100).toFixed(2)}%`,
				);
				lines.push(`- **P95 Latency:** ${lt.p95ResponseTime.toFixed(2)}ms`);
				lines.push(`- **Throughput:** ${lt.requestsPerSecond.toFixed(2)} RPS`);
				lines.push(`- **SLO Compliance:** ${lt.sloCompliance.overall ? 'PASS' : 'FAIL'}`);
				lines.push('');
			}

			if (report.performanceTestResults.stressTest) {
				const st = report.performanceTestResults.stressTest;
				lines.push('### Stress Test');
				lines.push(`- **Max Users:** ${st.maxUsersAchieved}`);
				lines.push(`- **Degradation Point:** ${st.degradationPoint || 'Not reached'}`);
				lines.push(`- **Breaking Point:** ${st.breakingPoint || 'Not reached'}`);
				lines.push(`- **Overall Result:** ${st.overallResult.toUpperCase()}`);
				lines.push('');
			}
		}

		// Alerts
		if (report.alerts.length > 0) {
			lines.push('## Alerts');
			for (const alert of report.alerts) {
				const severityIcon =
					alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
				lines.push(`- ${severityIcon} **${alert.severity.toUpperCase()}:** ${alert.message}`);
			}
			lines.push('');
		}

		// Recommendations
		if (report.recommendations.length > 0) {
			lines.push('## Recommendations');
			for (const recommendation of report.recommendations) {
				lines.push(`- ${recommendation}`);
			}
		}

		return lines.join('\n');
	}

	private updateHistory(report: SLOReport): void {
		// Add to reports history
		this.history.reports.push(report);
		if (this.history.reports.length > this.maxHistorySize) {
			this.history.reports.shift();
		}

		// Update compliance trend
		this.history.complianceTrend.push({
			date: report.timestamp,
			score: report.overallCompliance.score,
			status: report.overallCompliance.status,
		});

		if (this.history.complianceTrend.length > this.maxHistorySize) {
			this.history.complianceTrend.shift();
		}

		// Update performance trends
		this.history.performanceTrends.latency.push({
			date: report.timestamp,
			value: report.metricsSummary.averageLatency,
		});

		this.history.performanceTrends.errorRate.push({
			date: report.timestamp,
			value: report.metricsSummary.errorRate,
		});

		this.history.performanceTrends.throughput.push({
			date: report.timestamp,
			value: report.metricsSummary.throughput,
		});

		// Limit trend history
		const maxTrendSize = this.maxHistorySize;
		if (this.history.performanceTrends.latency.length > maxTrendSize) {
			this.history.performanceTrends.latency.shift();
			this.history.performanceTrends.errorRate.shift();
			this.history.performanceTrends.throughput.shift();
		}
	}

	public getHistory(): SLOHistory {
		return {
			reports: [...this.history.reports],
			complianceTrend: [...this.history.complianceTrend],
			performanceTrends: {
				latency: [...this.history.performanceTrends.latency],
				errorRate: [...this.history.performanceTrends.errorRate],
				throughput: [...this.history.performanceTrends.throughput],
			},
		};
	}

	public updateTargets(newTargets: Partial<SLOTargets>): void {
		this.targets = { ...this.targets, ...newTargets };
		console.log('SLO targets updated:', this.targets);
		this.initializeSLOs(); // Reinitialize SLOs with new targets
	}

	public getTargets(): SLOTargets {
		return { ...this.targets };
	}
}

// Export singleton instance
export const sloValidationService = SLOValidationService.getInstance();

// Export types
export type { SLOHistory, SLOReport, SLOTargets };
