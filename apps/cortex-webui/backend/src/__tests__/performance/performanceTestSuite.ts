// Performance Test Suite for brAInwav Cortex WebUI
// Comprehensive load testing, stress testing, and SLO validation

import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import type { Express } from 'express';
import { createApp } from '../../server.js';

// Type definitions for test results
interface TestResult {
	endpoint: string;
	statusCode: number;
	responseTime: number;
	contentLength: number;
	success: boolean;
	userIndex: number;
}

export interface LoadTestConfig {
	concurrentUsers: number;
	rampUpTime: number; // seconds
	testDuration: number; // seconds
	requestsPerSecond?: number;
	endpoints: TestEndpoint[];
	auth?: {
		type: 'basic' | 'bearer' | 'api-key';
		credentials: Record<string, string>;
	};
	headers?: Record<string, string>;
	bodyData?: Record<string, unknown>;
}

export interface TestEndpoint {
	path: string;
	method: 'GET' | 'POST' | 'PUT' | 'DELETE';
	weight?: number; // Weight for selection in random testing
	headers?: Record<string, string>;
	body?: unknown;
	expectedStatus?: number;
	expectedResponseTime?: number; // ms
}

export interface LoadTestResult {
	testName: string;
	startTime: Date;
	endTime: Date;
	duration: number;
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	errorRate: number;
	averageResponseTime: number;
	minResponseTime: number;
	maxResponseTime: number;
	p50ResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	requestsPerSecond: number;
	throughput: number; // bytes per second
	errors: Array<{
		statusCode: number;
		count: number;
		message: string;
	}>;
	endpointResults: Array<{
		endpoint: string;
		requests: number;
		successRate: number;
		averageLatency: number;
		p95Latency: number;
	}>;
	sloCompliance: {
		p95Latency: boolean;
		errorRate: boolean;
		throughput: boolean;
		overall: boolean;
	};
	systemMetrics: {
		memoryUsage: number;
		cpuUsage: number;
		activeConnections: number;
	};
}

export interface StressTestConfig {
	maxUsers: number;
	stepSize: number; // Users to add each step
	stepDuration: number; // seconds per step
	maxDuration: number; // seconds
	endpoint: TestEndpoint;
	failureThreshold: number; // percentage
	degradationThreshold: number; // percentage
}

export interface StressTestResult {
	testName: string;
	maxUsersAchieved: number;
	failurePoint: number;
	degradationPoint: number;
	breakingPoint: number;
	steps: Array<{
		userCount: number;
		successRate: number;
		averageLatency: number;
		errorRate: number;
		throughput: number;
	}>;
	overallResult: 'passed' | 'degraded' | 'failed';
}

export interface SLOValidationResult {
	overall: boolean;
	details: {
		p95Latency: {
			actual: number;
			target: number;
			passed: boolean;
		};
		errorRate: {
			actual: number;
			target: number;
			passed: boolean;
		};
		throughput: {
			actual: number;
			target: number;
			passed: boolean;
		};
	};
}

export class PerformanceTestSuite {
	private app: Express;
	private server: Server;
	private baseUrl: string;

	constructor() {
		this.app = createApp();
		this.server = createServer(this.app);
		this.baseUrl = 'http://localhost:0'; // Will be updated when server starts
	}

	public async startServer(): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(0, () => {
				const address = this.server.address();
				if (address && typeof address === 'object') {
					this.baseUrl = `http://localhost:${address.port}`;
				}
				console.log(`Performance test server started on ${this.baseUrl}`);
				resolve();
			});
		});
	}

	public async stopServer(): Promise<void> {
		return new Promise((resolve) => {
			this.server.close(() => {
				console.log('Performance test server stopped');
				resolve();
			});
		});
	}

	// Load testing methods
	public async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
		console.log(
			`Starting load test: ${config.concurrentUsers} users, ${config.testDuration}s duration`,
		);

		const startTime = new Date();
		const results: TestResult[] = [];

		const concurrentUsers = config.concurrentUsers;
		const rampUpTime = config.rampUpTime * 1000; // Convert to ms
		const testDuration = config.testDuration * 1000; // Convert to ms

		// Calculate ramp up delay for each user
		const userRampDelays = Array.from(
			{ length: concurrentUsers },
			(_, i) => (i * rampUpTime) / concurrentUsers,
		);

		// Create user simulation promises
		const userPromises = userRampDelays.map((delay, index) =>
			this.simulateUser(config, delay, testDuration, results, index),
		);

		// Wait for all users to complete
		await Promise.all(userPromises);

		const endTime = new Date();
		const duration = endTime.getTime() - startTime.getTime();

		// Calculate results
		const result = this.calculateLoadTestResults(config, results, startTime, endTime, duration);

		console.log(
			`Load test completed: ${result.totalRequests} requests, ${result.errorRate.toFixed(2)}% error rate, ${result.averageResponseTime.toFixed(2)}ms avg latency`,
		);

		return result;
	}

	private async simulateUser(
		config: LoadTestConfig,
		initialDelay: number,
		testDuration: number,
		results: TestResult[],
		userIndex: number,
	): Promise<void> {
		// Wait for initial ramp-up delay
		await new Promise((resolve) => setTimeout(resolve, initialDelay));

		const endTime = Date.now() + testDuration;
		const requestInterval = config.requestsPerSecond ? 1000 / config.requestsPerSecond : 1000; // Default: 1 request per second

		while (Date.now() < endTime) {
			// Select endpoint based on weights
			const endpoint = this.selectEndpointByWeight(config.endpoints);

			// Make request
			const requestResult = await this.makeRequest(
				endpoint,
				config.auth,
				config.headers,
				userIndex,
			);
			results.push(requestResult);

			// Wait for next request
			await new Promise((resolve) => setTimeout(resolve, requestInterval));
		}
	}

	private selectEndpointByWeight(endpoints: TestEndpoint[]): TestEndpoint {
		const totalWeight = endpoints.reduce((sum, ep) => sum + (ep.weight || 1), 0);
		let random = Math.random() * totalWeight;

		for (const endpoint of endpoints) {
			random -= endpoint.weight || 1;
			if (random <= 0) {
				return endpoint;
			}
		}

		return endpoints[0];
	}

	private async makeRequest(
		endpoint: TestEndpoint,
		auth?: LoadTestConfig['auth'],
		globalHeaders?: Record<string, string>,
		_userIndex?: number,
	): Promise<TestResult> {
		const startTime = performance.now();

		try {
			const url = `${this.baseUrl}${endpoint.path}`;
			const options: RequestInit = {
				method: endpoint.method,
				headers: {
					...globalHeaders,
					...endpoint.headers,
				},
			};

			// Add authentication
			if (auth) {
				switch (auth.type) {
					case 'bearer':
						options.headers = {
							...options.headers,
							Authorization: `Bearer ${auth.credentials.token}`,
						};
						break;
					case 'api-key':
						options.headers = {
							...options.headers,
							'X-API-Key': auth.credentials.key,
						};
						break;
					case 'basic': {
						const credentials = Buffer.from(
							`${auth.credentials.username}:${auth.credentials.password}`,
						).toString('base64');
						options.headers = {
							...options.headers,
							Authorization: `Basic ${credentials}`,
						};
						break;
					}
				}
			}

			// Add body for POST/PUT requests
			if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
				options.body =
					typeof endpoint.body === 'string' ? endpoint.body : JSON.stringify(endpoint.body);
				options.headers = {
					...options.headers,
					'Content-Type': 'application/json',
				};
			}

			const response = await fetch(url, options);
			const endTime = performance.now();
			const responseTime = endTime - startTime;
			const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);

			const success = response.status === (endpoint.expectedStatus || 200);

			return {
				endpoint: endpoint.path,
				statusCode: response.status,
				responseTime,
				contentLength,
				success,
				userIndex: _userIndex || 0,
			};
		} catch (_error) {
			const endTime = performance.now();
			const responseTime = endTime - startTime;

			return {
				endpoint: endpoint.path,
				statusCode: 0,
				responseTime,
				contentLength: 0,
				success: false,
				userIndex: _userIndex || 0,
			};
		}
	}

	private calculateLoadTestResults(
		config: LoadTestConfig,
		results: TestResult[],
		startTime: Date,
		endTime: Date,
		duration: number,
	): LoadTestResult {
		const totalRequests = results.length;
		const successfulRequests = results.filter((r) => r.success).length;
		const failedRequests = totalRequests - successfulRequests;
		const errorRate = (failedRequests / totalRequests) * 100;

		const responseTimes = results.map((r) => r.responseTime).sort((a, b) => a - b);
		const averageResponseTime =
			responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
		const minResponseTime = Math.min(...responseTimes);
		const maxResponseTime = Math.max(...responseTimes);

		// Calculate percentiles
		const p50Index = Math.floor(responseTimes.length * 0.5);
		const p95Index = Math.floor(responseTimes.length * 0.95);
		const p99Index = Math.floor(responseTimes.length * 0.99);

		const p50ResponseTime = responseTimes[p50Index];
		const p95ResponseTime = responseTimes[p95Index];
		const p99ResponseTime = responseTimes[p99Index];

		const requestsPerSecond = (totalRequests / duration) * 1000;
		const totalBytes = results.reduce((sum, r) => sum + r.contentLength, 0);
		const throughput = (totalBytes / duration) * 1000;

		// Calculate errors by status code
		const errorsByStatus = results
			.filter((r) => !r.success)
			.reduce(
				(acc, r) => {
					const key = r.statusCode;
					if (!acc[key]) {
						acc[key] = { count: 0, message: '' };
					}
					acc[key].count++;
					return acc;
				},
				{} as Record<number, { count: number; message: string }>,
			);

		const errors = Object.entries(errorsByStatus).map(([statusCode, data]) => ({
			statusCode: parseInt(statusCode, 10),
			count: data.count,
			message: `HTTP ${statusCode}`,
		}));

		// Calculate endpoint-specific results
		const endpointResults = config.endpoints.map((endpoint) => {
			const endpointResultsList = results.filter((r) => r.endpoint === endpoint.path);
			const endpointSuccessCount = endpointResultsList.filter((r) => r.success).length;
			const endpointSuccessRate = (endpointSuccessCount / endpointResultsList.length) * 100;
			const endpointResponseTimes = endpointResultsList
				.map((r) => r.responseTime)
				.sort((a, b) => a - b);
			const endpointAverageLatency =
				endpointResponseTimes.reduce((sum, time) => sum + time, 0) / endpointResponseTimes.length;
			const endpointP95Index = Math.floor(endpointResponseTimes.length * 0.95);
			const endpointP95Latency = endpointResponseTimes[endpointP95Index] || 0;

			return {
				endpoint: endpoint.path,
				requests: endpointResultsList.length,
				successRate: endpointSuccessRate,
				averageLatency: endpointAverageLatency,
				p95Latency: endpointP95Latency,
			};
		});

		// SLO compliance check (target SLOs)
		const sloCompliance = {
			p95Latency: p95ResponseTime <= 500, // 500ms target
			errorRate: errorRate <= 0.5, // 0.5% target
			throughput: requestsPerSecond >= 50, // 50 RPS target
			overall: false,
		};

		sloCompliance.overall =
			sloCompliance.p95Latency && sloCompliance.errorRate && sloCompliance.throughput;

		// System metrics (simplified)
		const systemMetrics = {
			memoryUsage: process.memoryUsage().heapUsed,
			cpuUsage: 0, // Would need to calculate CPU usage
			activeConnections: 0, // Would need to track active connections
		};

		return {
			testName: 'Load Test',
			startTime,
			endTime,
			duration,
			totalRequests,
			successfulRequests,
			failedRequests,
			errorRate,
			averageResponseTime,
			minResponseTime,
			maxResponseTime,
			p50ResponseTime,
			p95ResponseTime,
			p99ResponseTime,
			requestsPerSecond,
			throughput,
			errors,
			endpointResults,
			sloCompliance,
			systemMetrics,
		};
	}

	// Stress testing methods
	public async runStressTest(config: StressTestConfig): Promise<StressTestResult> {
		console.log(`Starting stress test: max users ${config.maxUsers}, step size ${config.stepSize}`);

		const steps: StressTestResult['steps'] = [];
		let currentUsers = 0;
		let failurePoint = 0;
		let degradationPoint = 0;
		let breakingPoint = 0;
		let testFailed = false;

		while (currentUsers < config.maxUsers && !testFailed) {
			currentUsers += config.stepSize;
			console.log(`Testing with ${currentUsers} concurrent users...`);

			// Run load test with current user count
			const loadTestConfig: LoadTestConfig = {
				concurrentUsers: currentUsers,
				rampUpTime: 30, // 30 second ramp up
				testDuration: config.stepDuration,
				endpoints: [config.endpoint],
			};

			const stepResult = await this.runLoadTest(loadTestConfig);

			const stepData = {
				userCount: currentUsers,
				successRate: (stepResult.successfulRequests / stepResult.totalRequests) * 100,
				averageLatency: stepResult.averageResponseTime,
				errorRate: stepResult.errorRate,
				throughput: stepResult.requestsPerSecond,
			};

			steps.push(stepData);

			// Check for failure conditions
			if (stepData.successRate < 100 - config.failureThreshold) {
				failurePoint = currentUsers;
				breakingPoint = currentUsers;
				testFailed = true;
				console.log(`Failure point reached at ${currentUsers} users`);
			} else if (stepData.errorRate > config.degradationThreshold) {
				if (degradationPoint === 0) {
					degradationPoint = currentUsers;
					console.log(`Degradation point reached at ${currentUsers} users`);
				}
			}

			// Check if we've exceeded maximum duration
			const totalTime = steps.reduce((sum, _step) => sum + config.stepDuration, 0);
			if (totalTime >= config.maxDuration) {
				break;
			}
		}

		const overallResult = testFailed ? 'failed' : degradationPoint > 0 ? 'degraded' : 'passed';

		return {
			testName: 'Stress Test',
			maxUsersAchieved: currentUsers,
			failurePoint,
			degradationPoint,
			breakingPoint,
			steps,
			overallResult,
		};
	}

	// SLO validation methods
	public async validateSLOs(): Promise<{
		p95Latency: boolean;
		errorRate: boolean;
		throughput: boolean;
		overall: boolean;
		details: {
			p95Latency: { target: number; actual: number; passed: boolean };
			errorRate: { target: number; actual: number; passed: boolean };
			throughput: { target: number; actual: number; passed: boolean };
		};
	}> {
		console.log('Running SLO validation test...');

		// Run a focused load test for SLO validation
		const sloTestConfig: LoadTestConfig = {
			concurrentUsers: 50,
			rampUpTime: 10,
			testDuration: 300, // 5 minutes
			endpoints: [
				{ path: '/api/models', method: 'GET', weight: 3 },
				{ path: '/api/conversations', method: 'GET', weight: 2 },
				{ path: '/api/chat/test/messages', method: 'POST', weight: 1, body: { message: 'test' } },
			],
		};

		const result = await this.runLoadTest(sloTestConfig);

		const p95LatencyTarget = 500; // ms
		const errorRateTarget = 0.5; // %
		const throughputTarget = 50; // RPS

		const p95LatencyPassed = result.p95ResponseTime <= p95LatencyTarget;
		const errorRatePassed = result.errorRate <= errorRateTarget;
		const throughputPassed = result.requestsPerSecond >= throughputTarget;

		const details = {
			p95Latency: {
				target: p95LatencyTarget,
				actual: result.p95ResponseTime,
				passed: p95LatencyPassed,
			},
			errorRate: {
				target: errorRateTarget,
				actual: result.errorRate,
				passed: errorRatePassed,
			},
			throughput: {
				target: throughputTarget,
				actual: result.requestsPerSecond,
				passed: throughputPassed,
			},
		};

		const overallPassed = p95LatencyPassed && errorRatePassed && throughputPassed;

		console.log(`SLO validation completed: ${overallPassed ? 'PASSED' : 'FAILED'}`);
		console.log(
			`P95 Latency: ${result.p95ResponseTime.toFixed(2)}ms (target: ${p95LatencyTarget}ms)`,
		);
		console.log(`Error Rate: ${result.errorRate.toFixed(2)}% (target: ${errorRateTarget}%)`);
		console.log(
			`Throughput: ${result.requestsPerSecond.toFixed(2)} RPS (target: ${throughputTarget} RPS)`,
		);

		return {
			p95Latency: p95LatencyPassed,
			errorRate: errorRatePassed,
			throughput: throughputPassed,
			overall: overallPassed,
			details,
		};
	}

	// Benchmark reporting
	public generateBenchmarkReport(results: {
		loadTest?: LoadTestResult;
		stressTest?: StressTestResult;
		sloValidation?: SLOValidationResult;
	}): string {
		const report: string[] = [];

		report.push('# brAInwav Cortex WebUI Performance Benchmark Report');
		report.push(`Generated: ${new Date().toISOString()}`);
		report.push('');

		if (results.loadTest) {
			const lt = results.loadTest;
			report.push('## Load Test Results');
			report.push(`- Total Requests: ${lt.totalRequests.toLocaleString()}`);
			report.push(
				`- Success Rate: ${((lt.successfulRequests / lt.totalRequests) * 100).toFixed(2)}%`,
			);
			report.push(`- Average Latency: ${lt.averageResponseTime.toFixed(2)}ms`);
			report.push(`- P95 Latency: ${lt.p95ResponseTime.toFixed(2)}ms`);
			report.push(`- P99 Latency: ${lt.p99ResponseTime.toFixed(2)}ms`);
			report.push(`- Throughput: ${lt.requestsPerSecond.toFixed(2)} RPS`);
			report.push(`- SLO Compliance: ${lt.sloCompliance.overall ? 'PASS' : 'FAIL'}`);
			report.push('');
		}

		if (results.stressTest) {
			const st = results.stressTest;
			report.push('## Stress Test Results');
			report.push(`- Max Users Achieved: ${st.maxUsersAchieved}`);
			report.push(`- Degradation Point: ${st.degradationPoint || 'Not reached'} users`);
			report.push(`- Breaking Point: ${st.breakingPoint || 'Not reached'} users`);
			report.push(`- Overall Result: ${st.overallResult.toUpperCase()}`);
			report.push('');
		}

		if (results.sloValidation) {
			const slo = results.sloValidation;
			report.push('## SLO Validation');
			report.push(
				`- P95 Latency: ${slo.details.p95Latency.actual.toFixed(2)}ms (target: ${slo.details.p95Latency.target}ms) - ${slo.details.p95Latency.passed ? 'PASS' : 'FAIL'}`,
			);
			report.push(
				`- Error Rate: ${slo.details.errorRate.actual.toFixed(2)}% (target: ${slo.details.errorRate.target}%) - ${slo.details.errorRate.passed ? 'PASS' : 'FAIL'}`,
			);
			report.push(
				`- Throughput: ${slo.details.throughput.actual.toFixed(2)} RPS (target: ${slo.details.throughput.target} RPS) - ${slo.details.throughput.passed ? 'PASS' : 'FAIL'}`,
			);
			report.push(`- Overall: ${slo.overall ? 'PASS' : 'FAIL'}`);
			report.push('');
		}

		report.push('## Recommendations');

		if (results.loadTest) {
			if (!results.loadTest.sloCompliance.p95Latency) {
				report.push('- Optimize slow endpoints to meet P95 latency SLO');
			}
			if (!results.loadTest.sloCompliance.errorRate) {
				report.push('- Investigate and fix error-prone endpoints');
			}
			if (!results.loadTest.sloCompliance.throughput) {
				report.push('- Increase capacity or optimize for higher throughput');
			}
		}

		if (results.stressTest && results.stressTest.overallResult === 'failed') {
			report.push('- Improve system resilience under high load');
		}

		return report.join('\n');
	}
}

// Export test suite and types
export type { LoadTestConfig, LoadTestResult, StressTestConfig, StressTestResult, TestEndpoint };

// Predefined test configurations
export const standardLoadTestConfig: LoadTestConfig = {
	concurrentUsers: 100,
	rampUpTime: 60,
	testDuration: 300,
	endpoints: [
		{ path: '/api/models', method: 'GET', weight: 3 },
		{ path: '/api/conversations', method: 'GET', weight: 2 },
		{
			path: '/api/chat/test/messages',
			method: 'POST',
			weight: 1,
			body: { message: 'test message' },
		},
	],
};

export const stressTestConfig: StressTestConfig = {
	maxUsers: 1000,
	stepSize: 50,
	stepDuration: 60,
	maxDuration: 1800, // 30 minutes
	endpoint: { path: '/api/models', method: 'GET' },
	failureThreshold: 10, // 10% failure rate
	degradationThreshold: 5, // 5% degradation
};
