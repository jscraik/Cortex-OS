// Test suite for Metrics API Routes
// Comprehensive testing for metrics endpoints with security and brAInwav branding

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetricsRoutes } from '../metricsRoutes.ts';
import { MetricsService } from '../services/metricsService.ts';

describe('Metrics API Routes', () => {
	let app: express.Application;
	let mockMetricsService: any;

	beforeEach(() => {
		vi.clearAllMocks();

		app = express();
		app.use(express.json());

		// Create mock instance
		mockMetricsService = {
			getMetrics: vi.fn(),
			getMetricsJson: vi.fn(),
			collectMetrics: vi.fn(),
		};

		// Mock the singleton
		vi.mocked(MetricsService.getInstance).mockReturnValue(mockMetricsService);

		// Add metrics routes with API key authentication
		app.use('/metrics', createMetricsRoutes());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /metrics', () => {
		it('should return Prometheus-formatted metrics with valid API key', async () => {
			const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/test",status_code="200",service="cortex-webui",brand="brAInwav"} 1

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/test",le="0.1",service="cortex-webui",brand="brAInwav"} 0
http_request_duration_seconds_bucket{method="GET",route="/api/test",le="+Inf",service="cortex-webui",brand="brAInwav"} 1`;

			mockMetricsService.getMetrics.mockReturnValue(mockMetrics);

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect('Content-Type', /text\/plain/)
				.expect(200);

			expect(response.text).toBe(mockMetrics);
			expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
		});

		it('should require API key authentication', async () => {
			await request(app).get('/metrics').expect(401);

			await request(app).get('/metrics').set('X-API-Key', 'invalid-key').expect(401);
		});

		it('should accept API key via query parameter', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app).get('/metrics?api_key=test-api-key').expect(200);

			expect(response.text).toContain('test_metric');
		});

		it('should accept API key via Authorization header', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app)
				.get('/metrics')
				.set('Authorization', 'Bearer test-api-key')
				.expect(200);

			expect(response.text).toContain('test_metric');
		});

		it('should handle metrics service errors gracefully', async () => {
			mockMetricsService.getMetrics.mockImplementation(() => {
				throw new Error('Metrics collection failed');
			});

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect('Content-Type', /json/)
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'Metrics collection failed',
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
		});
	});

	describe('GET /metrics/json', () => {
		it('should return JSON-formatted metrics with valid API key', async () => {
			const mockJsonMetrics = {
				http_requests_total: {
					name: 'http_requests_total',
					help: 'Total HTTP requests',
					type: 'counter',
					values: {
						'{method="GET",route="/api/test",status_code="200"}': 1,
					},
				},
				memory_usage_bytes: {
					name: 'memory_usage_bytes',
					help: 'Memory usage in bytes',
					type: 'gauge',
					values: {
						'{}': 1024000,
					},
				},
			};

			mockMetricsService.getMetricsJson.mockReturnValue(mockJsonMetrics);

			const response = await request(app)
				.get('/metrics/json')
				.set('X-API-Key', 'test-api-key')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				metrics: mockJsonMetrics,
				timestamp: expect.any(String),
				brand: 'brAInwav',
				service: 'cortex-webui',
			});
		});

		it('should require API key authentication for JSON endpoint', async () => {
			await request(app).get('/metrics/json').expect(401);

			await request(app).get('/metrics/json').set('X-API-Key', 'invalid-key').expect(401);
		});

		it('should include metadata in JSON response', async () => {
			mockMetricsService.getMetricsJson.mockReturnValue({});

			const response = await request(app)
				.get('/metrics/json')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(response.body).toMatchObject({
				metrics: {},
				timestamp: expect.any(String),
				brand: 'brAInwav',
				service: 'cortex-webui',
				version: expect.any(String),
				uptime: expect.any(Number),
			});
		});
	});

	describe('POST /metrics/collect', () => {
		it('should trigger manual metrics collection with valid API key', async () => {
			mockMetricsService.collectMetrics.mockResolvedValue(undefined);

			const response = await request(app)
				.post('/metrics/collect')
				.set('X-API-Key', 'test-api-key')
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'collected',
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
			expect(mockMetricsService.collectMetrics).toHaveBeenCalledOnce();
		});

		it('should require API key for collection endpoint', async () => {
			await request(app).post('/metrics/collect').expect(401);

			await request(app).post('/metrics/collect').set('X-API-Key', 'invalid-key').expect(401);
		});

		it('should handle collection errors gracefully', async () => {
			mockMetricsService.collectMetrics.mockRejectedValue(new Error('Collection failed'));

			const response = await request(app)
				.post('/metrics/collect')
				.set('X-API-Key', 'test-api-key')
				.expect('Content-Type', /json/)
				.expect(500);

			expect(response.body).toMatchObject({
				error: 'Collection failed',
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
		});
	});

	describe('Security and Authentication', () => {
		it('should validate API key format', async () => {
			const invalidKeys = [
				'', // Empty
				'   ', // Whitespace only
				'too-short', // Too short
				'invalid-characters!', // Invalid characters
			];

			for (const invalidKey of invalidKeys) {
				await request(app).get('/metrics').set('X-API-Key', invalidKey).expect(401);
			}
		});

		it('should use environment variable for API key validation', async () => {
			// Mock environment variable
			process.env.METRICS_API_KEY = 'valid-env-key';

			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			await request(app).get('/metrics').set('X-API-Key', 'valid-env-key').expect(200);

			await request(app).get('/metrics').set('X-API-Key', 'invalid-env-key').expect(401);
		});

		it('should include security headers in responses', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(response.headers).toMatchObject({
				'x-content-type-options': 'nosniff',
				'x-frame-options': 'DENY',
				'cache-control': 'no-cache, no-store, must-revalidate',
			});
		});

		it('should handle authentication rate limiting', async () => {
			// This would require implementing rate limiting middleware
			// For now, just test that multiple failed attempts are handled consistently
			for (let i = 0; i < 10; i++) {
				await request(app).get('/metrics').set('X-API-Key', 'wrong-key').expect(401);
			}
		});
	});

	describe('HTTP Method Support', () => {
		it('should only allow GET for metrics endpoints', async () => {
			await request(app).post('/metrics').set('X-API-Key', 'test-api-key').expect(405);

			await request(app).put('/metrics').set('X-API-Key', 'test-api-key').expect(405);

			await request(app).delete('/metrics').set('X-API-Key', 'test-api-key').expect(405);

			await request(app).patch('/metrics').set('X-API-Key', 'test-api-key').expect(405);
		});

		it('should only allow POST for collect endpoint', async () => {
			await request(app).get('/metrics/collect').set('X-API-Key', 'test-api-key').expect(405);

			await request(app).put('/metrics/collect').set('X-API-Key', 'test-api-key').expect(405);

			await request(app).delete('/metrics/collect').set('X-API-Key', 'test-api-key').expect(405);
		});
	});

	describe('Content Type Handling', () => {
		it('should return text/plain for Prometheus format', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(response.headers['content-type']).toMatch(/text\/plain/);
		});

		it('should return application/json for JSON format', async () => {
			mockMetricsService.getMetricsJson.mockReturnValue({});

			const response = await request(app)
				.get('/metrics/json')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(response.headers['content-type']).toMatch(/application\/json/);
		});

		it('should handle Accept header negotiation', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);
			mockMetricsService.getMetricsJson.mockReturnValue({});

			// Prefer JSON when Accept header includes it
			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.set('Accept', 'application/json, text/plain;q=0.9')
				.expect(200);

			// Should still return Prometheus format as primary endpoint
			expect(response.headers['content-type']).toMatch(/text\/plain/);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle missing metrics gracefully', async () => {
			mockMetricsService.getMetrics.mockReturnValue('');

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(response.text).toBe('');
		});

		it('should handle service unavailable scenarios', async () => {
			mockMetricsService.getMetrics.mockImplementation(() => {
				throw new Error('Service temporarily unavailable');
			});

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect(503);

			expect(response.body).toMatchObject({
				error: 'Service temporarily unavailable',
				brand: 'brAInwav',
			});
		});

		it('should validate request parameters', async () => {
			// Test with invalid query parameters
			await request(app)
				.get('/metrics?invalid_param=value')
				.set('X-API-Key', 'test-api-key')
				.expect(200); // Should ignore unknown params

			// Test with multiple auth methods (should use header first)
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app)
				.get('/metrics?api_key=query-key')
				.set('X-API-Key', 'header-key')
				.expect(200);

			expect(response.status).toBe(200);
		});

		it('should handle concurrent requests safely', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			// Make multiple concurrent requests
			const promises = Array.from({ length: 10 }, () =>
				request(app).get('/metrics').set('X-API-Key', 'test-api-key'),
			);

			const responses = await Promise.all(promises);

			// All should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.text).toContain('test_metric');
			});
		});
	});

	describe('Response Format and Standards', () => {
		it('should include brAInwav branding in error responses', async () => {
			const response = await request(app).get('/metrics').expect(401);

			expect(response.body).toMatchObject({
				error: expect.any(String),
				timestamp: expect.any(String),
				brand: 'brAInwav',
			});
		});

		it('should include consistent timestamp format', async () => {
			mockMetricsService.getMetrics.mockReturnValue(
				'# HELP test_metric Test metric\ntest_metric 1',
			);

			const response = await request(app)
				.get('/metrics/json')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			expect(() => {
				new Date(response.body.timestamp);
			}).not.toThrow();
		});

		it('should follow Prometheus metrics format standards', async () => {
			const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",service="cortex-webui",brand="brAInwav"} 1
# EOF`;

			mockMetricsService.getMetrics.mockReturnValue(mockMetrics);

			const response = await request(app)
				.get('/metrics')
				.set('X-API-Key', 'test-api-key')
				.expect(200);

			// Validate Prometheus format
			expect(response.text).toMatch(/^# HELP /m);
			expect(response.text).toMatch(/^# TYPE /m);
			expect(response.text).toMatch(/service="cortex-webui"/);
			expect(response.text).toMatch(/brand="brAInwav"/);
		});
	});
});
