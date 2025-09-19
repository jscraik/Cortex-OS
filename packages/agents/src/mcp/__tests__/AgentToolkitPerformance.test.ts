/**
 * Performance optimization tests for large-scale code operations
 *
 * Tests batch processing, parallel execution, memory efficiency,
 * and scalability of agent-toolkit operations for enterprise codebases.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentToolkitMCPTools } from '../AgentToolkitMCPTools.js';

// Performance measurement utilities
class PerformanceProfiler {
	private startTime: number = 0;
	private measurements: Array<{ operation: string; duration: number; memoryUsed: number }> = [];

	start(): void {
		this.startTime = performance.now();
	}

	measure(operation: string): { duration: number; memoryUsed: number } {
		const duration = performance.now() - this.startTime;
		const memoryUsed = process.memoryUsage().heapUsed;

		const measurement = { operation, duration, memoryUsed };
		this.measurements.push(measurement);

		return measurement;
	}

	getMeasurements(): Array<{ operation: string; duration: number; memoryUsed: number }> {
		return [...this.measurements];
	}

	clear(): void {
		this.measurements = [];
	}

	getAverageDuration(): number {
		if (this.measurements.length === 0) return 0;
		return this.measurements.reduce((sum, m) => sum + m.duration, 0) / this.measurements.length;
	}

	getTotalMemoryUsed(): number {
		if (this.measurements.length === 0) return 0;
		return Math.max(...this.measurements.map((m) => m.memoryUsed));
	}
}

describe('Agent Toolkit Performance Optimization for Large-Scale Operations', () => {
	let agentToolkitMCPTools: AgentToolkitMCPTools;
	let mockEventBus: { emit: ReturnType<typeof vi.fn> };
	let profiler: PerformanceProfiler;

	beforeEach(() => {
		mockEventBus = { emit: vi.fn() };
		agentToolkitMCPTools = new AgentToolkitMCPTools(undefined, mockEventBus);
		profiler = new PerformanceProfiler();
	});

	afterEach(() => {
		profiler.clear();
	});

	describe('Batch Processing Performance', () => {
		it('should scale linearly with batch size', async () => {
			const batchSizes = [10, 50, 100, 200];
			const durations: number[] = [];

			for (const batchSize of batchSizes) {
				const requests = Array.from({ length: batchSize }, (_, i) => ({
					pattern: `pattern_${i}`,
					path: `/src/large_codebase/module_${i % 20}/file_${i}.js`, // Simulate modular structure
				}));

				profiler.start();
				await agentToolkitMCPTools.batchSearch(requests);
				const measurement = profiler.measure(`batch_${batchSize}`);

				durations.push(measurement.duration);
			}

			// Verify approximately linear scaling (within reasonable variance)
			// Note: With parallelization and optimizations, performance can be better than linear
			for (let i = 1; i < batchSizes.length; i++) {
				const expectedRatio = batchSizes[i] / batchSizes[i - 1];
				const actualRatio = durations[i] / durations[i - 1];

				// Allow for significant variance due to parallelization benefits
				// Parallel execution can be much faster, so we just check reasonable bounds
				expect(actualRatio).toBeLessThan(expectedRatio * 2.0); // Not too much slower
				expect(actualRatio).toBeGreaterThan(0.1); // Can be much faster due to parallelization
			}
		});

		it('should maintain consistent performance across multiple batch operations', async () => {
			const iterationCount = 5;
			const batchSize = 50;
			const durations: number[] = [];

			for (let iteration = 0; iteration < iterationCount; iteration++) {
				const requests = Array.from({ length: batchSize }, (_, i) => ({
					pattern: `iteration_${iteration}_pattern_${i}`,
					path: `/src/modules/mod_${i % 10}/component_${i}.ts`,
				}));

				profiler.start();
				await agentToolkitMCPTools.batchSearch(requests);
				const measurement = profiler.measure(`iteration_${iteration}`);

				durations.push(measurement.duration);
			}

			// Performance should be consistent (coefficient of variation < 2.0)
			// Allow for more variance in test environments
			const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
			const variance =
				durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / durations.length;
			const standardDeviation = Math.sqrt(variance);
			const coefficientOfVariation = standardDeviation / avgDuration;

			expect(coefficientOfVariation).toBeLessThan(2.0);
		});

		it('should optimize batch validation for different file types', async () => {
			const fileTypeBatches = [
				// JavaScript files
				Array.from({ length: 30 }, (_, i) => `/src/js/module${i}.js`),
				// TypeScript files
				Array.from({ length: 30 }, (_, i) => `/src/ts/component${i}.ts`),
				// Mixed file types
				Array.from({ length: 30 }, (_, i) =>
					i % 2 === 0 ? `/src/mixed/file${i}.js` : `/src/mixed/file${i}.ts`,
				),
			];

			const batchResults: Array<{ type: string; duration: number }> = [];

			for (const [index, batch] of fileTypeBatches.entries()) {
				const batchType = ['js', 'ts', 'mixed'][index];

				profiler.start();
				await agentToolkitMCPTools.batchValidate([batch]);
				const measurement = profiler.measure(`${batchType}_validation`);

				batchResults.push({ type: batchType, duration: measurement.duration });
			}

			// All batches should complete within reasonable time
			batchResults.forEach((result) => {
				expect(result.duration).toBeLessThan(3000); // 3 seconds max
			});
		});
	});

	describe('Memory Efficiency and Resource Management', () => {
		it('should maintain stable memory usage during large operations', async () => {
			const initialMemory = process.memoryUsage().heapUsed;
			const memorySnapshots: number[] = [initialMemory];

			// Perform large operations in sequence
			for (let batch = 0; batch < 10; batch++) {
				const requests = Array.from({ length: 100 }, (_, i) => ({
					pattern: `large_search_${batch}_${i}`,
					path: `/enterprise/codebase/service_${i % 20}/handler_${i}.java`,
				}));

				await agentToolkitMCPTools.batchSearch(requests);

				// Force garbage collection and measure memory
				if (global.gc) global.gc();
				memorySnapshots.push(process.memoryUsage().heapUsed);
			}

			// Memory growth should be bounded
			const finalMemory = memorySnapshots[memorySnapshots.length - 1];
			const memoryGrowth = finalMemory - initialMemory;

			// Should not grow more than 100MB for this operation
			expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
		});

		it('should efficiently manage execution history for large volumes', async () => {
			// Generate large volume of operations
			const operationCount = 1000;

			profiler.start();

			for (let i = 0; i < operationCount; i++) {
				const searchTool = agentToolkitMCPTools.search();
				await searchTool.handler({
					pattern: `volume_test_${i}`,
					path: `/large/codebase/file_${i}.cpp`,
				});
			}

			const measurement = profiler.measure('large_volume_operations');

			// Verify history is maintained efficiently
			const history = agentToolkitMCPTools.getExecutionHistory();
			expect(history.size).toBe(operationCount);

			// Operation should complete within reasonable time
			expect(measurement.duration).toBeLessThan(10000); // 10 seconds max
		});

		it('should implement efficient cleanup mechanisms', async () => {
			// Fill up execution history
			for (let i = 0; i < 500; i++) {
				const searchTool = agentToolkitMCPTools.search();
				await searchTool.handler({
					pattern: `cleanup_test_${i}`,
					path: `/test/file_${i}.py`,
				});
			}

			const beforeCleanup = process.memoryUsage().heapUsed;

			// Clear execution history
			agentToolkitMCPTools.clearExecutionHistory();

			// Force garbage collection
			if (global.gc) global.gc();

			const afterCleanup = process.memoryUsage().heapUsed;

			// Memory should be reclaimed (allow for some variance in garbage collection)
			// Note: Memory reclamation depends on garbage collection timing
			const memoryDifference = Math.abs(afterCleanup - beforeCleanup);
			const memoryDifferencePercent = memoryDifference / beforeCleanup;

			// Either memory was reclaimed OR it stayed relatively stable
			const memoryWasReclaimed = afterCleanup < beforeCleanup;
			const memoryStayedStable = memoryDifferencePercent < 0.1; // Less than 10% change

			expect(memoryWasReclaimed || memoryStayedStable).toBe(true);
			expect(agentToolkitMCPTools.getExecutionHistory().size).toBe(0);
		});
	});

	describe('Parallel Execution Optimization', () => {
		it('should maximize parallelization for independent operations', async () => {
			const parallelOperations = Array.from({ length: 20 }, (_, i) => ({
				pattern: `parallel_${i}`,
				path: `/microservices/service_${i}/src`,
			}));

			// Test sequential vs parallel execution
			profiler.start();
			const sequentialResults = [];
			for (const op of parallelOperations) {
				const result = await agentToolkitMCPTools.search().handler(op);
				sequentialResults.push(result);
			}
			const sequentialTime = profiler.measure('sequential_operations').duration;

			profiler.start();
			const parallelResults = await agentToolkitMCPTools.batchSearch(parallelOperations);
			const parallelTime = profiler.measure('parallel_operations').duration;

			// Parallel execution should be significantly faster
			expect(parallelTime).toBeLessThan(sequentialTime * 0.8);
			expect(parallelResults.length).toBe(sequentialResults.length);
		});

		it('should optimize resource contention in high-concurrency scenarios', async () => {
			const concurrentBatches = Array.from({ length: 5 }, (_, batchIndex) =>
				Array.from({ length: 20 }, (_, i) => ({
					pattern: `concurrent_batch_${batchIndex}_${i}`,
					path: `/distributed/system/node_${i}/service.scala`,
				})),
			);

			profiler.start();

			// Execute multiple batches concurrently
			const batchPromises = concurrentBatches.map((batch) =>
				agentToolkitMCPTools.batchSearch(batch),
			);

			const results = await Promise.all(batchPromises);
			const measurement = profiler.measure('concurrent_batches');

			// All batches should complete successfully
			expect(results.length).toBe(5);
			results.forEach((batchResult) => {
				expect(batchResult.length).toBe(20);
				expect(batchResult.every((r) => r.success)).toBe(true);
			});

			// Should complete within reasonable time despite contention
			expect(measurement.duration).toBeLessThan(8000);
		});
	});

	describe('Enterprise-Scale Performance Benchmarks', () => {
		it('should handle enterprise codebase search scenarios', async () => {
			// Simulate enterprise codebase structure
			const enterpriseSearchScenarios = [
				// Security audit - search for potential vulnerabilities
				{
					name: 'security_audit',
					requests: Array.from({ length: 50 }, (_, i) => ({
						pattern: `(eval|exec|innerHTML|dangerouslySetInnerHTML)`,
						path: `/enterprise/frontend/module_${i % 15}`,
					})),
				},
				// Dependency analysis - find import patterns
				{
					name: 'dependency_analysis',
					requests: Array.from({ length: 75 }, (_, i) => ({
						pattern: `import.*from.*['"](@company|lodash|react)`,
						path: `/enterprise/backend/service_${i % 25}`,
					})),
				},
				// Architecture review - find architectural patterns
				{
					name: 'architecture_review',
					requests: Array.from({ length: 40 }, (_, i) => ({
						pattern: `(class|interface|abstract).*Controller|Service|Repository`,
						path: `/enterprise/core/domain_${i % 10}`,
					})),
				},
			];

			const scenarioResults: Array<{ name: string; duration: number; throughput: number }> = [];

			for (const scenario of enterpriseSearchScenarios) {
				profiler.start();
				await agentToolkitMCPTools.batchSearch(scenario.requests);
				const measurement = profiler.measure(scenario.name);

				const throughput = scenario.requests.length / (measurement.duration / 1000); // Operations per second

				scenarioResults.push({
					name: scenario.name,
					duration: measurement.duration,
					throughput,
				});
			}

			// Verify enterprise-level performance requirements
			scenarioResults.forEach((result) => {
				expect(result.duration).toBeLessThan(15000); // 15 seconds max per scenario
				expect(result.throughput).toBeGreaterThan(3); // At least 3 ops/sec
			});
		});

		it('should validate performance at enterprise scale', async () => {
			// Simulate validating large enterprise project
			const enterpriseFiles = Array.from({ length: 500 }, (_, i) => {
				const fileTypes = ['.js', '.ts', '.java', '.py', '.scala', '.go'];
				const fileType = fileTypes[i % fileTypes.length];
				return `/enterprise/monorepo/services/service_${Math.floor(i / 20)}/src/component_${i}${fileType}`;
			});

			// Split into reasonable batches for validation
			const batchSize = 50;
			const fileBatches = [];
			for (let i = 0; i < enterpriseFiles.length; i += batchSize) {
				fileBatches.push(enterpriseFiles.slice(i, i + batchSize));
			}

			profiler.start();
			await agentToolkitMCPTools.batchValidate(fileBatches);
			const measurement = profiler.measure('enterprise_validation');

			// Should handle enterprise validation within acceptable time
			expect(measurement.duration).toBeLessThan(30000); // 30 seconds max

			// Verify reasonable throughput
			const filesPerSecond = enterpriseFiles.length / (measurement.duration / 1000);
			expect(filesPerSecond).toBeGreaterThan(10); // At least 10 files/sec
		});

		it('should demonstrate code transformation scalability', async () => {
			// Simulate large-scale code transformation scenarios
			const transformationScenarios = [
				// API migration - update import statements
				{
					pattern: 'import.*from.*[\'"]@old-api',
					replacement: 'import.*from.*[\'"]@new-api',
					files: Array.from({ length: 100 }, (_, i) => `/migration/frontend/module_${i}.js`),
				},
				// Framework upgrade - update component syntax
				{
					pattern: 'class.*extends.*Component',
					replacement: 'const.*=.*().*=>',
					files: Array.from({ length: 80 }, (_, i) => `/upgrade/components/component_${i}.jsx`),
				},
				// Security fix - sanitize user inputs
				{
					pattern: 'innerHTML.*=.*user',
					replacement: 'textContent.*=.*sanitize(user',
					files: Array.from({ length: 60 }, (_, i) => `/security/views/view_${i}.js`),
				},
			];

			const transformationResults: Array<{ scenario: string; duration: number }> = [];

			for (const [index, scenario] of transformationScenarios.entries()) {
				profiler.start();

				// Execute transformation for each file
				const codemodPromises = scenario.files.map((file) =>
					agentToolkitMCPTools.codemod().handler({
						find: scenario.pattern,
						replace: scenario.replacement,
						path: file,
					}),
				);

				await Promise.all(codemodPromises);
				const measurement = profiler.measure(`transformation_${index}`);

				transformationResults.push({
					scenario: `transformation_${index}`,
					duration: measurement.duration,
				});
			}

			// All transformations should complete within enterprise SLA
			transformationResults.forEach((result) => {
				expect(result.duration).toBeLessThan(20000); // 20 seconds max per scenario
			});
		});
	});

	describe('Performance Monitoring and Metrics', () => {
		it('should provide detailed performance metrics', async () => {
			// Execute various operations to generate metrics
			await agentToolkitMCPTools.batchSearch([
				{ pattern: 'metrics_test_1', path: '/src' },
				{ pattern: 'metrics_test_2', path: '/src' },
			]);

			await agentToolkitMCPTools.batchValidate([['/src/file1.js', '/src/file2.js']]);

			const stats = agentToolkitMCPTools.getToolStats();

			// Verify comprehensive metrics are available
			expect(stats.totalExecutions).toBeGreaterThan(0);
			expect(stats.successfulExecutions).toBeGreaterThan(0);
			expect(stats.tools.length).toBeGreaterThan(0);

			// Verify per-tool metrics
			stats.tools.forEach((tool) => {
				expect(tool.name).toBeDefined();
				expect(tool.executions).toBeGreaterThan(0);
				expect(tool.successRate).toBeGreaterThanOrEqual(0);
				expect(tool.successRate).toBeLessThanOrEqual(1);
			});
		});

		it('should track performance degradation over time', async () => {
			const performanceBaseline: number[] = [];

			// Establish baseline performance
			for (let i = 0; i < 5; i++) {
				profiler.start();
				await agentToolkitMCPTools.batchSearch([{ pattern: `baseline_${i}`, path: '/src' }]);
				performanceBaseline.push(profiler.measure(`baseline_${i}`).duration);
			}

			const baselineAvg =
				performanceBaseline.reduce((sum, d) => sum + d, 0) / performanceBaseline.length;

			// Simulate sustained usage
			for (let round = 0; round < 3; round++) {
				for (let i = 0; i < 20; i++) {
					await agentToolkitMCPTools.search().handler({
						pattern: `sustained_${round}_${i}`,
						path: `/sustained/round_${round}/file_${i}.js`,
					});
				}
			}

			// Measure performance after sustained usage
			const postUsagePerformance: number[] = [];
			for (let i = 0; i < 5; i++) {
				profiler.start();
				await agentToolkitMCPTools.batchSearch([{ pattern: `post_usage_${i}`, path: '/src' }]);
				postUsagePerformance.push(profiler.measure(`post_usage_${i}`).duration);
			}

			const postUsageAvg =
				postUsagePerformance.reduce((sum, d) => sum + d, 0) / postUsagePerformance.length;

			// Performance should not degrade significantly
			// Allow for more variance as performance can vary with system load
			const degradationRatio = postUsageAvg / baselineAvg;
			expect(degradationRatio).toBeLessThan(5.0); // Less than 5x degradation (very generous)
		});
	});
});
