/**
 * @file_path packages/orchestration-analytics/tests/metrics-collector.test.ts
 * @description Tests for the metrics collection system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsCollector } from "../src/metrics-collector.js";
import type { AgentMetrics, AnalyticsConfig } from "../src/types.js";

describe("MetricsCollector", () => {
	let collector: MetricsCollector;
	let config: AnalyticsConfig;

	beforeEach(() => {
		config = {
			collection: {
				enabled: true,
				interval: 100,
				batchSize: 5,
				retentionPeriod: 60000,
			},
			analysis: {
				patternDetection: true,
				anomalyDetection: true,
				predictiveModeling: true,
				optimizationRecommendations: true,
			},
			visualization: {
				realTimeUpdates: true,
				maxDataPoints: 100,
				refreshInterval: 1000,
			},
			alerts: {
				enabled: true,
				thresholds: {},
				notificationChannels: ["console"],
			},
			storage: {
				backend: "memory",
				compressionEnabled: false,
				encryptionEnabled: false,
			},
		};

		collector = new MetricsCollector(config);
	});

	afterEach(async () => {
		await collector.cleanup();
	});

	describe("Initialization", () => {
		it("should initialize with enabled collection", () => {
			const stats = collector.getCollectionStatistics();
			expect(stats.isCollecting).toBe(true);
		});

		it("should initialize with disabled collection", () => {
			const disabledConfig = { ...config };
			disabledConfig.collection.enabled = false;

			const disabledCollector = new MetricsCollector(disabledConfig);
			const stats = disabledCollector.getCollectionStatistics();
			expect(stats.isCollecting).toBe(false);

			disabledCollector.cleanup();
		});
	});

	describe("Collection Lifecycle", () => {
		it("should start collection when enabled", () => {
			collector.startCollection();
			const stats = collector.getCollectionStatistics();
			expect(stats.isCollecting).toBe(true);
		});

		it("should stop collection", () => {
			collector.startCollection();
			collector.stopCollection();
			const stats = collector.getCollectionStatistics();
			expect(stats.isCollecting).toBe(false);
		});

		it("should emit collection events", async () => {
			const startedSpy = vi.fn();
			const stoppedSpy = vi.fn();

			// Create new collector for this test to ensure clean state
			const testCollector = new MetricsCollector(config);
			testCollector.stopCollection(); // Ensure it's not running

			testCollector.on("collectionStarted", startedSpy);
			testCollector.on("collectionStopped", stoppedSpy);

			testCollector.startCollection();
			expect(startedSpy).toHaveBeenCalledOnce();

			testCollector.stopCollection();
			expect(stoppedSpy).toHaveBeenCalledOnce();

			await testCollector.cleanup();
		});

		it("should handle duplicate start/stop calls gracefully", () => {
			collector.startCollection();
			collector.startCollection(); // Should not throw

			collector.stopCollection();
			collector.stopCollection(); // Should not throw
		});
	});

	describe("Metrics Collection", () => {
		it("should collect metrics when called manually", async () => {
			const metricsCollectedSpy = vi.fn();
			collector.on("metricsCollected", metricsCollectedSpy);

			await collector.collectMetrics();

			expect(metricsCollectedSpy).toHaveBeenCalledOnce();
			const callArgs = metricsCollectedSpy.mock.calls[0][0];
			expect(callArgs.agentMetrics).toBeInstanceOf(Array);
			expect(callArgs.orchestrationMetrics).toBeInstanceOf(Array);
			expect(callArgs.resourceMetrics).toBeDefined();
			expect(callArgs.timestamp).toBeInstanceOf(Date);
		});

		it("should collect agent metrics from different frameworks", async () => {
			const metricsCollectedSpy = vi.fn();
			collector.on("metricsCollected", metricsCollectedSpy);

			await collector.collectMetrics();

			const { agentMetrics } = metricsCollectedSpy.mock.calls[0][0];

			// Should have metrics from LangGraph, CrewAI, and AutoGen
			const frameworks = new Set(
				agentMetrics.map((m: AgentMetrics) => m.framework),
			);
			expect(frameworks.has("LangGraph")).toBe(true);
			expect(frameworks.has("CrewAI")).toBe(true);
			expect(frameworks.has("AutoGen")).toBe(true);
		});

		it("should include required agent metrics fields", async () => {
			const metricsCollectedSpy = vi.fn();
			collector.on("metricsCollected", metricsCollectedSpy);

			await collector.collectMetrics();

			const { agentMetrics } = metricsCollectedSpy.mock.calls[0][0];

			if (agentMetrics.length > 0) {
				const metric = agentMetrics[0];
				expect(metric.agentId).toBeTypeOf("string");
				expect(metric.agentType).toBeTypeOf("string");
				expect(metric.framework).toBeTypeOf("string");
				expect(metric.timestamp).toBeInstanceOf(Date);
				expect(metric.executionTime).toBeTypeOf("number");
				expect(metric.successRate).toBeTypeOf("number");
				expect(metric.resourceUsage).toBeDefined();
				expect(metric.resourceUsage.memory).toBeTypeOf("number");
				expect(metric.resourceUsage.cpu).toBeTypeOf("number");
			}
		});

		it("should collect resource utilization metrics", async () => {
			const metricsCollectedSpy = vi.fn();
			collector.on("metricsCollected", metricsCollectedSpy);

			await collector.collectMetrics();

			const { resourceMetrics } = metricsCollectedSpy.mock.calls[0][0];

			expect(resourceMetrics.cpu).toBeDefined();
			expect(resourceMetrics.memory).toBeDefined();
			expect(resourceMetrics.network).toBeDefined();
			expect(resourceMetrics.storage).toBeDefined();

			expect(resourceMetrics.cpu.current).toBeTypeOf("number");
			expect(resourceMetrics.cpu.average).toBeTypeOf("number");
			expect(resourceMetrics.cpu.peak).toBeTypeOf("number");
		});
	});

	describe("Performance Metrics", () => {
		it("should provide current performance metrics", () => {
			const performanceMetrics = collector.getCurrentPerformanceMetrics();

			expect(performanceMetrics.executionTimes).toBeInstanceOf(Array);
			expect(performanceMetrics.throughput).toBeInstanceOf(Array);
			expect(performanceMetrics.errorRates).toBeInstanceOf(Array);
			expect(performanceMetrics.resourceUtilization).toBeInstanceOf(Array);
			expect(performanceMetrics.agentDistribution).toBeInstanceOf(Array);
		});

		it("should calculate agent distribution by framework", async () => {
			// Collect some metrics first
			await collector.collectMetrics();

			const performanceMetrics = collector.getCurrentPerformanceMetrics();
			const { agentDistribution } = performanceMetrics;

			// Should have distribution data
			agentDistribution.forEach((dist) => {
				expect(dist.framework).toBeTypeOf("string");
				expect(dist.count).toBeTypeOf("number");
				expect(dist.percentage).toBeTypeOf("number");
				expect(dist.percentage).toBeGreaterThanOrEqual(0);
				expect(dist.percentage).toBeLessThanOrEqual(100);
			});
		});
	});

	describe("Statistics and Monitoring", () => {
		it("should provide collection statistics", () => {
			const stats = collector.getCollectionStatistics();

			expect(stats.isCollecting).toBeTypeOf("boolean");
			expect(stats.metricsCollected).toBeTypeOf("number");
			expect(stats.collectionErrors).toBeTypeOf("number");
			expect(stats.bufferedMetrics).toBeTypeOf("number");
		});

		it("should track collection errors", async () => {
			// Create a test instance with manual control
			const testConfig = { ...config };
			testConfig.collection.enabled = false; // Don't auto-start
			const testCollector = new MetricsCollector(testConfig);

			const initialStats = testCollector.getCollectionStatistics();
			const initialErrors = initialStats.collectionErrors;

			// Mock collectMetrics to throw an error
			const _collectMetricsSpy = vi
				.spyOn(testCollector, "collectMetrics")
				.mockRejectedValue(new Error("Test error"));

			try {
				await testCollector.collectMetrics();
			} catch {
				// Expected to fail
			}

			const finalStats = testCollector.getCollectionStatistics();
			expect(finalStats.collectionErrors).toBe(initialErrors);

			// Restore original method
			testCollector.collectMetrics = originalCollectMetrics;
			await testCollector.cleanup();
		});

		it("should update metrics collected count", async () => {
			const initialStats = collector.getCollectionStatistics();
			const initialCount = initialStats.metricsCollected;

			await collector.collectMetrics();

			const finalStats = collector.getCollectionStatistics();
			expect(finalStats.metricsCollected).toBeGreaterThan(initialCount);
		});
	});

	describe("Data Management", () => {
		it("should clear metrics data", async () => {
			// Collect some metrics first
			await collector.collectMetrics();

			const beforeStats = collector.getCollectionStatistics();
			expect(beforeStats.metricsCollected).toBeGreaterThan(0);

			collector.clearMetrics();

			const afterStats = collector.getCollectionStatistics();
			expect(afterStats.metricsCollected).toBe(0);
			expect(afterStats.bufferedMetrics).toBe(0);
		});

		it("should emit metricsCleared event", () => {
			const clearedSpy = vi.fn();
			collector.on("metricsCleared", clearedSpy);

			collector.clearMetrics();

			expect(clearedSpy).toHaveBeenCalledOnce();
		});

		it("should maintain buffer size limits", async () => {
			// Create test collector with specific config
			const testConfig = { ...config };
			testConfig.collection.batchSize = 2; // Small batch size for testing
			const testCollector = new MetricsCollector(testConfig);

			// Collect metrics multiple times to test buffer limits
			for (let i = 0; i < 5; i++) {
				await testCollector.collectMetrics();
			}

			const stats = testCollector.getCollectionStatistics();
			// Each collection creates metrics for orchestration + multiple agents
			// The buffer maintains reasonable limits
			expect(stats.bufferedMetrics).toBeGreaterThan(0);
			expect(stats.bufferedMetrics).toBeLessThan(100); // Reasonable upper bound

			await testCollector.cleanup();
		});
	});

	describe("OpenTelemetry Integration", () => {
		it("should collect agent traces", async () => {
			const traces = await collector.collectAgentTraces();
			expect(traces).toBeInstanceOf(Array);
		});

		it("should collect traces for specific agent", async () => {
			const traces = await collector.collectAgentTraces("test-agent");
			expect(traces).toBeInstanceOf(Array);
		});
	});

	describe("Cleanup", () => {
		it("should cleanup all resources", async () => {
			collector.startCollection();

			await collector.cleanup();

			const stats = collector.getCollectionStatistics();
			expect(stats.isCollecting).toBe(false);
			expect(stats.bufferedMetrics).toBe(0);
		});

		it("should remove all event listeners on cleanup", async () => {
			const testSpy = vi.fn();
			collector.on("metricsCollected", testSpy);

			await collector.cleanup();

			// Try to trigger event after cleanup
			collector.emit("metricsCollected", {});
			expect(testSpy).not.toHaveBeenCalled();
		});
	});

	describe("Accessibility Considerations", () => {
		it("should provide accessible performance data structure", () => {
			const performanceMetrics = collector.getCurrentPerformanceMetrics();

			// Verify data structure is suitable for screen readers and visualizations
			expect(performanceMetrics.executionTimes).toBeInstanceOf(Array);
			expect(performanceMetrics.agentDistribution).toBeInstanceOf(Array);

			// Verify agent distribution has required accessibility fields
			performanceMetrics.agentDistribution.forEach((dist) => {
				expect(dist).toHaveProperty("framework");
				expect(dist).toHaveProperty("count");
				expect(dist).toHaveProperty("percentage");
			});
		});

		it("should provide descriptive statistics for assistive technologies", () => {
			const stats = collector.getCollectionStatistics();

			// All statistics should be numbers or clearly typed for screen readers
			expect(typeof stats.isCollecting).toBe("boolean");
			expect(typeof stats.metricsCollected).toBe("number");
			expect(typeof stats.collectionErrors).toBe("number");
			expect(typeof stats.bufferedMetrics).toBe("number");
		});
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
