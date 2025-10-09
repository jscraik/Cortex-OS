/**
 * Phase 7.1: k6 Load Test for Health Endpoints
 *
 * Tests SLO compliance under load for /health endpoints.
 *
 * Run: k6 run tests/performance/load-health.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');
const readyLatency = new Trend('ready_latency');
const liveLatency = new Trend('live_latency');

// Load test configuration
export const options = {
	stages: [
		{ duration: '30s', target: 50 }, // Ramp up to 50 users
		{ duration: '2m', target: 50 }, // Stay at 50 for 2 min
		{ duration: '30s', target: 100 }, // Spike to 100
		{ duration: '1m', target: 100 }, // Hold spike
		{ duration: '30s', target: 0 }, // Ramp down
	],

	// SLO thresholds (brAInwav requirements)
	thresholds: {
		// Overall HTTP metrics
		http_req_duration: ['p(95)<50'], // 95% under 50ms
		'http_req_duration{endpoint:health}': ['p(95)<10'], // Health: P95 < 10ms
		'http_req_duration{endpoint:ready}': ['p(95)<20'], // Ready: P95 < 20ms
		'http_req_duration{endpoint:live}': ['p(95)<5'], // Live: P95 < 5ms
		http_req_failed: ['rate<0.001'], // <0.1% errors

		// Custom metrics
		errors: ['rate<0.001'], // brAInwav SLO: <0.1%
		health_latency: ['p(95)<10'],
		ready_latency: ['p(95)<20'],
		live_latency: ['p(95)<5'],
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
	// Test /health endpoint
	let res = http.get(`${BASE_URL}/health`, {
		tags: { endpoint: 'health' },
	});

	healthLatency.add(res.timings.duration);

	check(res, {
		'health status is 200': (r) => r.status === 200,
		'health has status field': (r) => JSON.parse(r.body).status !== undefined,
		'health response time OK': (r) => r.timings.duration < 10,
	}) || errorRate.add(1);

	sleep(0.1);

	// Test /health/ready endpoint
	res = http.get(`${BASE_URL}/health/ready`, {
		tags: { endpoint: 'ready' },
	});

	readyLatency.add(res.timings.duration);

	check(res, {
		'ready status is 200': (r) => r.status === 200,
		'ready response time OK': (r) => r.timings.duration < 20,
	}) || errorRate.add(1);

	sleep(0.1);

	// Test /health/live endpoint
	res = http.get(`${BASE_URL}/health/live`, {
		tags: { endpoint: 'live' },
	});

	liveLatency.add(res.timings.duration);

	check(res, {
		'live status is 200': (r) => r.status === 200,
		'live response time OK': (r) => r.timings.duration < 5,
	}) || errorRate.add(1);

	sleep(0.2);
}

export function handleSummary(data) {
	return {
		stdout: textSummary(data, { indent: ' ', enableColors: true }),
		'tests/performance/results/health-load-test.json': JSON.stringify(data),
	};
}

// Helper function for text summary
function textSummary(data, options) {
	const indent = options.indent || '';
	const _enableColors = options.enableColors || false;

	let summary = '\n';
	summary += `${indent}brAInwav Health Endpoints Load Test Summary\n`;
	summary += `${indent}============================================\n\n`;

	// Requests
	const requests = data.metrics.http_reqs.values.count;
	summary += `${indent}Total Requests: ${requests}\n`;

	// Duration
	const duration = data.state.testRunDurationMs / 1000;
	summary += `${indent}Test Duration: ${duration.toFixed(2)}s\n`;

	// Success rate
	const failedRate = data.metrics.http_req_failed.values.rate;
	const successRate = (1 - failedRate) * 100;
	summary += `${indent}Success Rate: ${successRate.toFixed(3)}%\n\n`;

	// Latency breakdown
	summary += `${indent}Latency (ms):\n`;
	summary += `${indent}  /health       P95: ${data.metrics.health_latency.values['p(95)'].toFixed(2)}ms\n`;
	summary += `${indent}  /health/ready P95: ${data.metrics.ready_latency.values['p(95)'].toFixed(2)}ms\n`;
	summary += `${indent}  /health/live  P95: ${data.metrics.live_latency.values['p(95)'].toFixed(2)}ms\n\n`;

	// SLO compliance
	summary += `${indent}SLO Compliance:\n`;
	const healthSLO = data.metrics.health_latency.values['p(95)'] < 10;
	const readySLO = data.metrics.ready_latency.values['p(95)'] < 20;
	const liveSLO = data.metrics.live_latency.values['p(95)'] < 5;

	summary += `${indent}  /health       ${healthSLO ? '✓ PASS' : '✗ FAIL'}\n`;
	summary += `${indent}  /health/ready ${readySLO ? '✓ PASS' : '✗ FAIL'}\n`;
	summary += `${indent}  /health/live  ${liveSLO ? '✓ PASS' : '✗ FAIL'}\n`;

	return summary;
}
