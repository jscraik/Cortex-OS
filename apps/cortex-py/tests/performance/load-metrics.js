/**
 * Phase 7.1: k6 Load Test for Metrics Endpoint
 *
 * Tests /metrics endpoint under load for Prometheus scraping.
 *
 * Run: k6 run tests/performance/load-metrics.js
 */

import { check } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const metricsLatency = new Trend('metrics_latency');

export const options = {
	stages: [
		{ duration: '30s', target: 20 }, // Prometheus scrapes every 30s
		{ duration: '2m', target: 20 }, // Steady load
		{ duration: '30s', target: 0 }, // Ramp down
	],

	thresholds: {
		http_req_duration: ['p(95)<50'], // P95 < 50ms
		http_req_failed: ['rate<0.001'], // <0.1% errors
		metrics_latency: ['p(95)<50'], // brAInwav SLO
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
	const res = http.get(`${BASE_URL}/metrics`);

	metricsLatency.add(res.timings.duration);

	check(res, {
		'status is 200': (r) => r.status === 200,
		'content-type is text/plain': (r) => r.headers['Content-Type'].includes('text/plain'),
		'contains brainwav metrics': (r) => r.body.includes('brainwav_'),
		'response time OK': (r) => r.timings.duration < 50,
	}) || errorRate.add(1);
}
