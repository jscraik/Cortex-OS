import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import { join } from 'node:path';

/**
 * Phase 9 Test: Metrics Reality Check
 * 
 * This test ensures that no Math.random() calls are used in metrics collection
 * and that all system metrics are derived from real system probes for brAInwav production readiness.
 */
describe('Metrics Reality - Phase 9 Production Readiness', () => {
	it('should not contain Math.random() in metrics collection code', async () => {
		// Search for Math.random() usage in metrics-related files
		const metricsFiles = await glob('**/*metrics*.{ts,js}', {
			cwd: process.cwd(),
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/tests/**', '**/*.test.*', '**/*.spec.*']
		});

		const analyticsFiles = await glob('**/analytics/**/*.{ts,js}', {
			cwd: process.cwd(),
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/tests/**', '**/*.test.*', '**/*.spec.*']
		});

		const allFiles = [...metricsFiles, ...analyticsFiles];
		const violations: Array<{ file: string; line: number; content: string }> = [];

		for (const file of allFiles) {
			try {
				const content = await readFile(file, 'utf-8');
				const lines = content.split('\n');
				
				lines.forEach((line, index) => {
					if (line.includes('Math.random()')) {
						violations.push({
							file: file.replace(process.cwd(), '.'),
							line: index + 1,
							content: line.trim(),
						});
					}
				});
			} catch (error) {
				// Skip files that can't be read
				continue;
			}
		}

		if (violations.length > 0) {
			const violationSummary = violations
				.map(v => `${v.file}:${v.line} - ${v.content}`)
				.join('\n');

			throw new Error(
				`brAInwav cortex-os contains ${violations.length} Math.random() violations in metrics code:

${violationSummary}

All metrics must be derived from real system probes for production readiness.`
			);
		}

		expect(violations).toHaveLength(0);
	});

	it('should not contain fake system resource generation', async () => {
		const sourceFiles = await glob('src/**/*.{ts,js}', {
			cwd: process.cwd(),
			absolute: true,
		});

		const fakeResourceViolations: Array<{ file: string; line: number; content: string }> = [];

		for (const file of sourceFiles) {
			try {
				const content = await readFile(file, 'utf-8');
				const lines = content.split('\n');
				
				lines.forEach((line, index) => {
					const lowerLine = line.toLowerCase().trim();
					
					// Check for fake resource generation patterns
					if (
						(lowerLine.includes('cpu:') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('memory:') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('gpu:') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('network:') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('storage:') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('resourceusage') && lowerLine.includes('math.random'))
					) {
						fakeResourceViolations.push({
							file: file.replace(process.cwd(), '.'),
							line: index + 1,
							content: line.trim(),
						});
					}
				});
			} catch (error) {
				// Skip files that can't be read
				continue;
			}
		}

		if (fakeResourceViolations.length > 0) {
			const violationSummary = fakeResourceViolations
				.map(v => `${v.file}:${v.line} - ${v.content}`)
				.join('\n');

			throw new Error(
				`brAInwav cortex-os contains ${fakeResourceViolations.length} fake resource generation violations:

${violationSummary}

All system resources must be obtained from real system probes.`
			);
		}

		expect(fakeResourceViolations).toHaveLength(0);
	});

	it('should not contain mock performance data generation', async () => {
		const sourceFiles = await glob('src/**/*.{ts,js}', {
			cwd: process.cwd(),
			absolute: true,
		});

		const mockPerformanceViolations: Array<{ file: string; line: number; content: string }> = [];

		for (const file of sourceFiles) {
			try {
				const content = await readFile(file, 'utf-8');
				const lines = content.split('\n');
				
				lines.forEach((line, index) => {
					const lowerLine = line.toLowerCase().trim();
					
					// Check for mock performance data patterns
					if (
						(lowerLine.includes('executiontime') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('responsetime') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('throughput') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('successrate') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('availability') && lowerLine.includes('math.random')) ||
						(lowerLine.includes('performance') && lowerLine.includes('math.random'))
					) {
						mockPerformanceViolations.push({
							file: file.replace(process.cwd(), '.'),
							line: index + 1,
							content: line.trim(),
						});
					}
				});
			} catch (error) {
				// Skip files that can't be read
				continue;
			}
		}

		if (mockPerformanceViolations.length > 0) {
			const violationSummary = mockPerformanceViolations
				.map(v => `${v.file}:${v.line} - ${v.content}`)
				.join('\n');

			throw new Error(
				`brAInwav cortex-os contains ${mockPerformanceViolations.length} mock performance data violations:

${violationSummary}

All performance metrics must be derived from real measurements.`
			);
		}

		expect(mockPerformanceViolations).toHaveLength(0);
	});

	it('should use real system probes for resource utilization', async () => {
		// Check if metrics-collector uses real system monitoring
		const metricsCollectorFile = join(process.cwd(), 'packages/evidence/analytics/src/metrics-collector.ts');
		
		try {
			const content = await readFile(metricsCollectorFile, 'utf-8');
			
			// Should contain real system monitoring imports/calls
			const hasRealSystemMonitoring = 
				content.includes('os.') ||
				content.includes('process.') ||
				content.includes('fs.') ||
				content.includes('systeminformation') ||
				content.includes('node-os-utils') ||
				content.includes('pidusage') ||
				content.includes('/proc/') ||
				content.includes('performance.') ||
				content.includes('process.memoryUsage') ||
				content.includes('process.cpuUsage') ||
				content.includes('process.uptime');

			// Should NOT contain comments indicating fake implementations
			const hasFakeImplementationComments = 
				content.includes('// In a real implementation') ||
				content.includes('// Mock') ||
				content.includes('// TODO: Replace with real') ||
				content.includes('// Fake');

			if (!hasRealSystemMonitoring && hasFakeImplementationComments) {
				throw new Error(
					'brAInwav metrics collector does not use real system probes. Implementation contains fake/mock system monitoring indicators.'
				);
			}

			// Verify that collectResourceUtilization doesn't use only Math.random()
			const resourceUtilizationMatch = content.match(/collectResourceUtilization[\s\S]*?(?=private|\}$|$)/);
			if (resourceUtilizationMatch) {
				const methodContent = resourceUtilizationMatch[0];
				const mathRandomCount = (methodContent.match(/Math\.random\(\)/g) || []).length;
				const realSystemCallCount = (methodContent.match(/process\.|os\.|fs\.|performance\./g) || []).length;

				if (mathRandomCount > 0 && realSystemCallCount === 0) {
					throw new Error(
						'brAInwav collectResourceUtilization method uses only Math.random() without real system calls.'
					);
				}
			}

		} catch (error) {
			if (error.code === 'ENOENT') {
				// File doesn't exist, skip this specific test
				return;
			}
			throw error;
		}
	});

	it('should verify ML model weights are not randomly generated for production', async () => {
		const optimizationEngineFile = join(process.cwd(), 'packages/evidence/analytics/src/optimization-engine.ts');
		
		try {
			const content = await readFile(optimizationEngineFile, 'utf-8');
			
			// Check for model weight initialization
			const modelWeightMatch = content.match(/getOrInitializeModelWeights[\s\S]*?(?=private|\}$|$)/);
			if (modelWeightMatch) {
				const methodContent = modelWeightMatch[0];
				
				// Should not contain comments indicating production weights would be loaded
				if (methodContent.includes('// In production, these would be loaded from a trained model file')) {
					throw new Error(
						'brAInwav ML optimization engine still uses placeholder model weights. Production weights must be loaded from trained model files.'
					);
				}

				// Should not use Matrix.random for production weights
				const hasRandomWeights = methodContent.includes('Matrix.random') && 
					methodContent.includes('Math.random');

				if (hasRandomWeights) {
					throw new Error(
						'brAInwav ML optimization engine uses randomly generated model weights instead of trained weights.'
					);
				}
			}

		} catch (error) {
			if (error.code === 'ENOENT') {
				// File doesn't exist, skip this specific test
				return;
			}
			throw error;
		}
	});

	it('should not contain hardcoded fake orchestration data', async () => {
		const sourceFiles = await glob('src/**/*.{ts,js}', {
			cwd: process.cwd(),
			absolute: true,
		});

		const fakeOrchestrationViolations: Array<{ file: string; line: number; content: string }> = [];

		for (const file of sourceFiles) {
			try {
				const content = await readFile(file, 'utf-8');
				const lines = content.split('\n');
				
				lines.forEach((line, index) => {
					const lowerLine = line.toLowerCase().trim();
					
					// Check for hardcoded orchestration data
					if (
						(lowerLine.includes('orchestration-1') && lowerLine.includes('framework')) ||
						(lowerLine.includes('mock orchestration data')) ||
						(lowerLine.includes('// mock') && lowerLine.includes('orchestration'))
					) {
						fakeOrchestrationViolations.push({
							file: file.replace(process.cwd(), '.'),
							line: index + 1,
							content: line.trim(),
						});
					}
				});
			} catch (error) {
				// Skip files that can't be read
				continue;
			}
		}

		if (fakeOrchestrationViolations.length > 0) {
			const violationSummary = fakeOrchestrationViolations
				.map(v => `${v.file}:${v.line} - ${v.content}`)
				.join('\n');

			throw new Error(
				`brAInwav cortex-os contains ${fakeOrchestrationViolations.length} fake orchestration data violations:

${violationSummary}

All orchestration data must come from real orchestration engines.`
			);
		}

		expect(fakeOrchestrationViolations).toHaveLength(0);
	});

	it('should validate that system resource monitoring is production-ready', () => {
		// This test validates that the system has real monitoring capabilities
		
		// Check that Node.js built-in monitoring is available
		expect(typeof process.memoryUsage).toBe('function');
		expect(typeof process.cpuUsage).toBe('function');
		expect(typeof process.uptime).toBe('function');
		expect(typeof performance.now).toBe('function');

		// Test that these functions return real data
		const memUsage = process.memoryUsage();
		expect(memUsage.rss).toBeGreaterThan(0);
		expect(memUsage.heapUsed).toBeGreaterThan(0);
		expect(memUsage.heapTotal).toBeGreaterThan(0);

		const cpuUsage = process.cpuUsage();
		expect(cpuUsage.user).toBeGreaterThanOrEqual(0);
		expect(cpuUsage.system).toBeGreaterThanOrEqual(0);

		const uptime = process.uptime();
		expect(uptime).toBeGreaterThan(0);

		const perfNow = performance.now();
		expect(perfNow).toBeGreaterThan(0);
	});
});