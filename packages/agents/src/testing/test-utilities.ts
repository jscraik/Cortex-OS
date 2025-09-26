/**
 * Comprehensive Testing Infrastructure - Enhanced Test Utilities
 * Following TDD plan requirements for brAInwav Cortex-OS agents
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { AgentError, ErrorCategory, ErrorSeverity } from '../lib/error-handling.js';
import { MemoryBoundedStore } from '../lib/memory-manager.js';
import { secureRatio } from '../lib/secure-random.js';
import type { AgentConfig, AgentMessage, Tool, ToolOutput } from '../types.js';

// Test configuration schema
export const TestConfigSchema = z.object({
	timeout: z.number().default(30000),
	retries: z.number().default(3),
	parallel: z.boolean().default(false),
	cleanup: z.boolean().default(true),
	verbose: z.boolean().default(false),
	isolated: z.boolean().default(true),
	skipBranding: z.boolean().default(false), // For brAInwav branding requirements
});

export type TestConfig = z.infer<typeof TestConfigSchema>;

// Mock agent configuration
export interface MockAgentConfig extends Partial<AgentConfig> {
	mockBehavior?: 'success' | 'failure' | 'timeout' | 'random';
	responseDelay?: number;
	failureRate?: number;
}

// Test result interface
export interface TestResult {
	success: boolean;
	duration: number;
	error?: AgentError;
	metrics?: TestMetrics;
	logs?: string[];
	brandingValidated?: boolean; // For brAInwav compliance
}

// Test metrics
export interface TestMetrics {
	memoryUsage: number;
	cpuTime: number;
	networkCalls: number;
	errorCount: number;
	assertionCount: number;
}

/**
 * Enhanced Mock Agent for testing
 */
export class MockAgent extends EventEmitter {
	private config: MockAgentConfig;
	private callCount = 0;
	private isDestroyed = false;

	constructor(config: MockAgentConfig = {}) {
		super();
		this.config = {
			name: 'mock-agent',
			type: 'test',
			capabilities: ['test'],
			modelProvider: 'mock',
			mockBehavior: 'success',
			responseDelay: 0,
			failureRate: 0,
			...config,
		};
	}

	async execute(input: string): Promise<AgentMessage> {
		if (this.isDestroyed) {
			throw new AgentError(
				'brAInwav agent mock has been destroyed',
				ErrorCategory.VALIDATION,
				ErrorSeverity.HIGH,
			);
		}

		this.callCount++;

		// Simulate response delay
		if (this.config.responseDelay && this.config.responseDelay > 0) {
			await this.delay(this.config.responseDelay);
		}

		// Simulate different behaviors
		switch (this.config.mockBehavior) {
			case 'failure':
				throw new AgentError(
					'brAInwav mock agent simulated failure',
					ErrorCategory.UNKNOWN,
					ErrorSeverity.MEDIUM,
				);
			case 'timeout':
				await this.delay(60000); // Long delay to simulate timeout
				break;
			case 'random':
				if (secureRatio() < (this.config.failureRate || 0.3)) {
					throw new AgentError(
						'brAInwav mock agent random failure',
						ErrorCategory.UNKNOWN,
						ErrorSeverity.LOW,
					);
				}
				break;
		}

		const response: AgentMessage = {
			id: `mock-${this.callCount}`,
			type: 'assistant',
			content: `brAInwav mock response for: ${input}`,
			timestamp: new Date().toISOString(),
			metadata: {
				agent: this.config.name,
				callCount: this.callCount,
			},
		};

		this.emit('message', response);
		return response;
	}

	getCallCount(): number {
		return this.callCount;
	}

	reset(): void {
		this.callCount = 0;
		this.removeAllListeners();
	}

	destroy(): void {
		this.isDestroyed = true;
		this.reset();
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Mock Tool for testing tool execution
 */
export class MockTool implements Tool {
	public name: string;
	public description: string;
	public schema: Record<string, unknown>;
	private executionCount = 0;
	private mockResponse: unknown;
	private shouldFail: boolean;

	constructor(
		name: string,
		description: string,
		mockResponse: unknown = 'brAInwav mock tool result',
		shouldFail = false,
	) {
		this.name = name;
		this.description = description;
		this.schema = { type: 'object', properties: {} };
		this.mockResponse = mockResponse;
		this.shouldFail = shouldFail;
	}

	async execute(input: Record<string, unknown>): Promise<ToolOutput> {
		this.executionCount++;

		if (this.shouldFail) {
			throw new AgentError(
				`brAInwav mock tool ${this.name} simulated failure`,
				ErrorCategory.UNKNOWN,
				ErrorSeverity.MEDIUM,
				{ input, executionCount: this.executionCount },
			);
		}

		return {
			success: true,
			result: this.mockResponse || 'brAInwav mock tool result',
			executionTime: 0,
			timestamp: new Date().toISOString(),
		};
	}

	getExecutionCount(): number {
		return this.executionCount;
	}

	reset(): void {
		this.executionCount = 0;
	}
}

/**
 * Test Environment Manager
 */
export class TestEnvironment {
	private resources: Array<{ name: string; resource: unknown; cleanup: () => Promise<void> }> = [];
	private metrics: TestMetrics;
	private startTime: number;

	constructor() {
		this.metrics = {
			memoryUsage: 0,
			cpuTime: 0,
			networkCalls: 0,
			errorCount: 0,
			assertionCount: 0,
		};
		this.startTime = Date.now();
	}

	/**
	 * Register a resource for cleanup
	 */
	register<T>(name: string, resource: T, cleanup: () => Promise<void>): T {
		this.resources.push({ name, resource, cleanup });
		return resource;
	}

	/**
	 * Create a mock agent
	 */
	createMockAgent(config?: MockAgentConfig): MockAgent {
		const agent = new MockAgent(config);
		return this.register(`mock-agent-${Date.now()}`, agent, async () => {
			agent.destroy();
		});
	}

	/**
	 * Create a mock tool
	 */
	createMockTool(
		name: string,
		description = 'brAInwav mock tool',
		response: unknown = 'success',
		shouldFail = false,
	): MockTool {
		const tool = new MockTool(name, description, response, shouldFail);
		return this.register(`mock-tool-${name}`, tool, async () => {
			tool.reset();
		});
	}

	/**
	 * Create a test memory store
	 */
	createTestMemoryStore<T>(options?: { maxSize?: number; ttlMs?: number }): MemoryBoundedStore<T> {
		const store = new MemoryBoundedStore<T>({
			maxSize: options?.maxSize || 100,
			ttlMs: options?.ttlMs || 60000,
			enableMetrics: false,
		});
		return this.register(`memory-store-${Date.now()}`, store, async () => {
			store.destroy();
		});
	}

	/**
	 * Create a test circuit breaker
	 */
	createTestCircuitBreaker(options?: { failureThreshold?: number }): CircuitBreaker {
		const breaker = new CircuitBreaker({
			failureThreshold: options?.failureThreshold || 3,
			enableMetrics: false,
		});
		return this.register(`circuit-breaker-${Date.now()}`, breaker, async () => {
			breaker.destroy();
		});
	}

	/**
	 * Update metrics
	 */
	updateMetrics(updates: Partial<TestMetrics>): void {
		this.metrics = { ...this.metrics, ...updates };
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): TestMetrics & { duration: number } {
		return {
			...this.metrics,
			duration: Date.now() - this.startTime,
			memoryUsage: process.memoryUsage().heapUsed,
		};
	}

	/**
	 * Cleanup all resources
	 */
	async cleanup(): Promise<void> {
		console.log('🧹 brAInwav test environment cleanup starting...');

		for (const { name, cleanup } of this.resources) {
			try {
				await cleanup();
			} catch (error) {
				console.error(`Failed to cleanup ${name}:`, error);
			}
		}

		this.resources = [];
		console.log('✅ brAInwav test environment cleanup completed');
	}

	/**
	 * Validate brAInwav branding in outputs
	 */
	validateBranding(content: string): boolean {
		const brandingPatterns = [
			/brAInwav/i,
			/brainwav/i, // Common misspelling
		];

		return brandingPatterns.some((pattern) => pattern.test(content));
	}
}

/**
 * Test Suite Runner with enhanced capabilities
 */
export class TestSuiteRunner {
	private config: TestConfig;
	private environment: TestEnvironment;

	constructor(config: Partial<TestConfig> = {}) {
		this.config = TestConfigSchema.parse(config);
		this.environment = new TestEnvironment();
	}

	/**
	 * Run a test suite with setup and teardown
	 */
	async runSuite<T>(
		name: string,
		setup: (env: TestEnvironment) => Promise<T>,
		tests: (context: T, env: TestEnvironment) => Promise<TestResult[]>,
		teardown?: (context: T, env: TestEnvironment) => Promise<void>,
	): Promise<{ results: TestResult[]; summary: TestSuiteSummary }> {
		console.log(`🚀 brAInwav test suite "${name}" starting...`);

		let context: T;
		let results: TestResult[] = [];

		try {
			// Setup
			context = await setup(this.environment);

			// Run tests
			results = await tests(context, this.environment);

			// Validate brAInwav branding if required
			if (!(this.config as any).skipBranding) {
				results = results.map((result) => ({
					...result,
					brandingValidated:
						result.logs?.some((log) => this.environment.validateBranding(log)) || false,
				}));
			}

			// Teardown
			if (teardown) {
				await teardown(context, this.environment);
			}
		} catch (error) {
			results.push({
				success: false,
				duration: 0,
				error: AgentError.fromUnknown(error),
			});
		} finally {
			if (this.config.cleanup) {
				await this.environment.cleanup();
			}
		}

		const summary = this.generateSummary(name, results);
		console.log(`📊 brAInwav test suite "${name}" completed:`, summary);

		return { results, summary };
	}

	/**
	 * Run a single test with timeout and retry
	 */
	async runTest(
		name: string,
		testFn: () => Promise<void>,
		options?: Partial<TestConfig>,
	): Promise<TestResult> {
		const testConfig = { ...this.config, ...options };
		const startTime = Date.now();
		let lastError: AgentError | undefined;

		for (let attempt = 1; attempt <= testConfig.retries; attempt++) {
			try {
				if (testConfig.verbose) {
					console.log(`🔄 brAInwav test "${name}" attempt ${attempt}/${testConfig.retries}`);
				}

				// Run test with timeout
				await Promise.race([
					testFn(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('brAInwav test timeout')), testConfig.timeout),
					),
				]);

				return {
					success: true,
					duration: Date.now() - startTime,
					metrics: this.environment.getMetrics(),
				};
			} catch (error) {
				lastError = AgentError.fromUnknown(error);

				if (attempt === testConfig.retries) {
					break;
				}

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}
		}

		return {
			success: false,
			duration: Date.now() - startTime,
			error: lastError,
			metrics: this.environment.getMetrics(),
		};
	}

	/**
	 * Generate test summary
	 */
	private generateSummary(suiteName: string, results: TestResult[]): TestSuiteSummary {
		const passed = results.filter((r) => r.success).length;
		const failed = results.length - passed;
		const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
		const brandingCompliant = results.filter((r) => r.brandingValidated).length;

		return {
			suiteName,
			totalTests: results.length,
			passed,
			failed,
			successRate: results.length > 0 ? passed / results.length : 0,
			totalDuration,
			averageDuration: results.length > 0 ? totalDuration / results.length : 0,
			brandingCompliant,
			brandingComplianceRate: results.length > 0 ? brandingCompliant / results.length : 0,
		};
	}

	/**
	 * Cleanup test runner
	 */
	async cleanup(): Promise<void> {
		await this.environment.cleanup();
	}
}

// Test suite summary interface
export interface TestSuiteSummary {
	suiteName: string;
	totalTests: number;
	passed: number;
	failed: number;
	successRate: number;
	totalDuration: number;
	averageDuration: number;
	brandingCompliant: number;
	brandingComplianceRate: number;
}

/**
 * Assertion utilities with brAInwav-specific validations
 */
export class TestAssertions {
	static assertBrandingPresent(content: string, message?: string): void {
		const hasBranding = /brAInwav/i.test(content);
		if (!hasBranding) {
			throw new AgentError(
				message || 'brAInwav branding not found in content',
				ErrorCategory.VALIDATION,
				ErrorSeverity.MEDIUM,
				{ content },
			);
		}
	}

	static async assertEventuallyTrue(
		condition: () => boolean | Promise<boolean>,
		timeout = 5000,
		message?: string,
	): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const result = await condition();
			if (result) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		throw new AgentError(
			message || 'brAInwav condition was not eventually true',
			ErrorCategory.VALIDATION,
			ErrorSeverity.MEDIUM,
		);
	}

	static assertMemoryBounded(store: MemoryBoundedStore<unknown>, maxSize: number): void {
		const currentSize = store.size();
		if (currentSize > maxSize) {
			throw new AgentError(
				`brAInwav memory store exceeded bounds: ${currentSize} > ${maxSize}`,
				ErrorCategory.MEMORY,
				ErrorSeverity.HIGH,
				{ currentSize, maxSize },
			);
		}
	}

	static assertCircuitBreakerState(breaker: CircuitBreaker, expectedState: string): void {
		const currentState = breaker.getState();
		if (currentState !== expectedState) {
			throw new AgentError(
				`brAInwav circuit breaker state mismatch: expected ${expectedState}, got ${currentState}`,
				ErrorCategory.VALIDATION,
				ErrorSeverity.MEDIUM,
				{ expected: expectedState, actual: currentState },
			);
		}
	}
}

/**
 * Performance testing utilities
 */
export class PerformanceTestRunner {
	static async measureFunction<T>(
		fn: () => Promise<T>,
		iterations = 100,
	): Promise<{ result: T; avgDuration: number; minDuration: number; maxDuration: number }> {
		const durations: number[] = [];
		let result: T;

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			result = await fn();
			const duration = performance.now() - start;
			durations.push(duration);
		}

		return {
			result: result!,
			avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
			minDuration: Math.min(...durations),
			maxDuration: Math.max(...durations),
		};
	}

	static async loadTest(
		fn: () => Promise<void>,
		concurrency: number,
		duration: number,
	): Promise<{ totalRequests: number; requestsPerSecond: number; errors: number }> {
		const startTime = Date.now();
		const endTime = startTime + duration;
		let totalRequests = 0;
		let errors = 0;

		const workers = Array.from({ length: concurrency }, async () => {
			while (Date.now() < endTime) {
				try {
					await fn();
					totalRequests++;
				} catch {
					errors++;
				}
			}
		});

		await Promise.all(workers);

		return {
			totalRequests,
			requestsPerSecond: totalRequests / (duration / 1000),
			errors,
		};
	}
}

// Additional type definitions
export interface TestCase {
	name: string;
	testFn: () => Promise<void>;
	config?: Partial<TestConfig>;
}

export interface TestSuite {
	name: string;
	setup?: (env: TestEnvironment) => Promise<unknown>;
	tests: TestCase[];
	teardown?: (context: unknown, env: TestEnvironment) => Promise<void>;
}

export interface PerformanceMetrics {
	avgDuration: number;
	minDuration: number;
	maxDuration: number;
	totalRequests: number;
	requestsPerSecond: number;
	errors: number;
}
